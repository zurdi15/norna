<script setup lang="ts">
import {computed, nextTick, shallowRef, useTemplateRef, watch, watchEffect} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {useElementBounding, useElementSize, useScroll, useWindowScroll} from '@vueuse/core'
import {ChevronRight} from '@lucide/vue'

import type {Task} from '@/client/generated'
import type {TaskPatch} from '@/client/queries/tasks'
import {
	applyBarEdit,
	daysBetween,
	useGanttBarDrag,
	useGanttBarKeyboard,
	type GanttBarDrag,
	type GanttBarEdit,
	type GanttDaySpan,
	type GanttDragMode,
} from '@/composables/useGanttBar'
import {PRIORITIES} from '@/constants/priorities'
import PriorityMark from '@/features/tasks/PriorityMark.vue'
import TaskCheck from '@/features/tasks/TaskCheck.vue'
import {useTaskLink} from '@/features/tasks/useTaskLink'
import {buildRelationArrows, type GanttBarPosition} from '@/helpers/ganttRelationArrows'
import {addDays} from '@/helpers/time/dateMath'
import {defaultTimeOfDay, withTimeOfDay} from '@/helpers/time/timeOfDay'
import {getTaskIdentifier} from '@/modules/task/task'
import {useAuthStore} from '@/stores/auth'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiIcon from '@/ui/UiIcon.vue'

import GanttArrows from './GanttArrows.vue'
import GanttBar from './GanttBar.vue'
import GanttTimelineHeader from './GanttTimelineHeader.vue'
import {barEditPatch, drawnSpanPatch, type GanttBar as GanttBarModel} from './ganttBars'
import type {GanttRange} from './ganttRange'
import type {GanttRow} from './ganttRows'
import {dayOffset, dayWidthFor, timelineDays, type GanttScale} from './ganttTimeline'
import {useGanttFormat} from './useGanttFormat'

/**
 * The timeline itself: a scroller with the task titles pinned on the left and the
 * months and days pinned on top. Pointer screens edit bars in place (drag, resize,
 * arrow keys); touch screens get a read-only chart where a tap opens the task.
 */
const props = defineProps<{
	rows: GanttRow[]
	tasks: Map<number, Task>
	hiddenToAncestor: Map<number, number>
	collapsed: ReadonlySet<number>
	range: GanttRange
	scale: GanttScale
	now: Date
	canWrite: boolean
}>()

const emit = defineEmits<{
	update: [task: Task, patch: TaskPatch]
	toggle: [id: number]
}>()

const {t} = useI18n()
const router = useRouter()
const taskLink = useTaskLink()
const authStore = useAuthStore()
const actions = useTaskActionsStore()
const {isMd, hasFinePointer} = useBreakpoints()
const format = useGanttFormat(() => props.now)

const titleWidth = computed(() => isMd.value ? 296 : 132)
// Rows and bars grow to thumb size on touch screens.
const rowHeight = computed(() => hasFinePointer.value ? 36 : 44)
const barHeight = computed(() => hasFinePointer.value ? 22 : 26)
const editable = computed(() => props.canWrite && hasFinePointer.value)

const viewport = useTemplateRef<HTMLElement>('viewport')
const header = useTemplateRef<HTMLElement>('header')
const {width: viewportWidth, height: viewportHeight} = useElementSize(viewport)
const {height: headerHeight} = useElementSize(header)
const {top: viewportTop} = useElementBounding(viewport)
const {x: scrollX} = useScroll(viewport)
const {y: pageScroll} = useWindowScroll()

// The chart scrolls on its own down to the bottom of the screen, which keeps the scale in view.
const viewportStyle = computed(() => {
	const top = Math.max(0, Math.round(viewportTop.value + pageScroll.value))
	const reserve = isMd.value ? '1rem' : '(3.75rem + env(safe-area-inset-bottom))'
	return {height: `max(18rem, calc(100dvh - ${top}px - ${reserve}))`}
})

const days = computed(() => timelineDays(props.range, authStore.settings.week_start))
const dayWidth = computed(() => dayWidthFor(props.scale, viewportWidth.value - titleWidth.value, days.value.length))
const timelineWidth = computed(() => days.value.length * dayWidth.value)
const rowsHeight = computed(() => props.rows.length * rowHeight.value)
const bodyHeight = computed(() => Math.max(rowsHeight.value, viewportHeight.value - headerHeight.value))

const todayIndex = computed(() => {
	const index = daysBetween(props.range.from, props.now)
	return index >= 0 && index < days.value.length ? index : null
})
const nowOffset = computed(() => todayIndex.value === null ? null : dayOffset(props.range, props.now) * dayWidth.value)

const gridLines = computed(() => days.value
	.filter(day => day.index > 0 && (day.monthStart || day.weekStart || props.scale === 'day'))
	.map(day => ({
		left: day.index * dayWidth.value,
		tone: day.monthStart ? 'bg-line-strong' : day.weekStart ? 'bg-line' : 'bg-line/50',
	})))
const weekends = computed(() => days.value.filter(day => day.weekend))

// --- Editing ------------------------------------------------------------------

function newDateTime(day: Date): Date {
	return withTimeOfDay(day, defaultTimeOfDay(day, props.now, authStore.settings.frontend_settings.default_due_time))
}

const rowsById = computed(() => new Map(props.rows.map(row => [row.id, row])))

// A committed bar holds its new place until the cache has it, so it doesn't flash back first.
const settling = shallowRef(new Map<number, {span: GanttDaySpan, bar: GanttBarModel | null}>())

function commit(row: GanttRow, span: GanttDaySpan, patch: TaskPatch | null) {
	if (!patch) {
		return
	}
	const entry = {span, bar: row.bar}
	settling.value = new Map(settling.value).set(row.id, entry)
	emit('update', row.task, patch)
	window.setTimeout(() => {
		if (settling.value.get(row.id) === entry) {
			const next = new Map(settling.value)
			next.delete(row.id)
			settling.value = next
		}
	}, 4000)
}

const drag = useGanttBarDrag({
	dayWidth: () => dayWidth.value,
	scrollLeft: () => viewport.value?.scrollLeft ?? 0,
	onCommit: (active: GanttBarDrag) => {
		const row = rowsById.value.get(active.id)
		const span = applyBarEdit(active.span, active.edit)
		if (!row || !span) return
		if (active.mode === 'draw') {
			commit(row, span, drawnSpanPatch(span, newDateTime))
		} else if (row.bar) {
			commit(row, span, barEditPatch(row.task, row.bar, active.edit, newDateTime))
		}
	},
})

const keyboard = useGanttBarKeyboard({
	onCommit: (id: number, edit: GanttBarEdit) => {
		const row = rowsById.value.get(id)
		const span = row?.bar ? applyBarEdit(row.bar, edit) : null
		if (row?.bar && span) {
			commit(row, span, barEditPatch(row.task, row.bar, edit, newDateTime))
		}
	},
})

function displaySpan(row: GanttRow): GanttDaySpan | null {
	const active = drag.active.value
	if (active?.id === row.id && drag.moved.value) {
		return applyBarEdit(active.span, active.edit) ?? active.span
	}
	const pending = keyboard.pending.value
	if (pending?.id === row.id && row.bar) {
		return applyBarEdit(row.bar, pending.edit) ?? row.bar
	}
	const settled = settling.value.get(row.id)
	return settled && settled.bar === row.bar ? settled.span : row.bar
}

watch(() => props.rows, () => {
	if (settling.value.size === 0) return
	const next = new Map([...settling.value].filter(([id, {bar}]) => rowsById.value.get(id)?.bar === bar))
	if (next.size !== settling.value.size) {
		settling.value = next
	}
})

interface RowLayout {
	row: GanttRow
	span: GanttDaySpan | null
	left: number
	width: number
	cutStart: boolean
	cutEnd: boolean
	visible: boolean
	active: boolean
}

const layout = computed<RowLayout[]>(() => props.rows.map(row => {
	const span = displaySpan(row)
	const active = (drag.active.value?.id === row.id && drag.moved.value) || keyboard.pending.value?.id === row.id
	if (!span) {
		return {row, span, left: 0, width: 0, cutStart: false, cutEnd: false, visible: false, active}
	}
	const startIndex = daysBetween(props.range.from, span.start)
	const endIndex = daysBetween(props.range.from, span.end)
	const first = Math.max(startIndex, 0)
	const last = Math.min(endIndex, days.value.length - 1)
	return {
		row,
		span,
		left: first * dayWidth.value,
		width: (last - first + 1) * dayWidth.value,
		cutStart: startIndex < 0,
		cutEnd: endIndex > days.value.length - 1,
		visible: first <= last,
		active,
	}
}))

const arrows = computed(() => {
	const positions = new Map<number, GanttBarPosition>()
	layout.value.forEach((item, rowIndex) => {
		if (item.visible && item.row.bar) {
			positions.set(item.row.id, {
				x: item.left,
				y: rowIndex * rowHeight.value + rowHeight.value / 2,
				width: item.width,
				rowIndex,
			})
		}
	})
	return buildRelationArrows(props.tasks, positions, props.hiddenToAncestor)
})

function barLabel(item: RowLayout): string {
	const bar = item.row.bar!
	const values = {task: item.row.task.title ?? '', start: format.day(bar.start), end: format.day(bar.end)}
	if (bar.derived) return t('projectView.gantt.barDerived', values)
	if (bar.type === 'startOnly') return t('projectView.gantt.barStartOnly', values)
	if (bar.type === 'endOnly') return t('projectView.gantt.barEndOnly', values)
	return t('projectView.gantt.bar', values)
}

function open(row: GanttRow) {
	void router.push(taskLink(row.id))
}

function onBarDrag(event: PointerEvent, row: GanttRow, mode: GanttDragMode) {
	if (!editable.value || !row.bar || row.bar.derived) return
	drag.start(event, {id: row.id, mode, span: row.bar})
}

function onBarClick(row: GanttRow) {
	if (!drag.consumeClick()) {
		open(row)
	}
}

// The browser's own scrolling into view doesn't know about the pinned title column and header.
// (scroll-padding would, but it also scrolls away whenever something in the title column gets focus.)
function reveal(element: HTMLElement) {
	const scroller = viewport.value
	if (!scroller) return
	const port = scroller.getBoundingClientRect()
	const box = element.getBoundingClientRect()
	const left = port.left + titleWidth.value + 8
	const right = port.left + scroller.clientWidth - 8
	if (box.left < left) {
		scroller.scrollLeft -= left - box.left
	} else if (box.right > right) {
		scroller.scrollLeft += Math.min(box.right - right, box.left - left)
	}
	const top = port.top + headerHeight.value + 4
	const bottom = port.top + scroller.clientHeight - 4
	if (box.top < top) {
		scroller.scrollTop -= top - box.top
	} else if (box.bottom > bottom) {
		scroller.scrollTop += box.bottom - bottom
	}
}

// Only keyboard focus: a press that starts a drag must not scroll the bar away from the pointer.
function onBarFocus(event: FocusEvent) {
	const target = event.target as HTMLElement
	if (target.matches(':focus-visible')) {
		reveal(target)
	}
}

function focusBar(fromIndex: number, step: 1 | -1) {
	for (let index = fromIndex + step; index >= 0 && index < layout.value.length; index += step) {
		if (layout.value[index]!.visible) {
			const bar = viewport.value?.querySelector<HTMLElement>(`[data-row-index="${index}"] [data-gantt-bar]`)
			bar?.focus({preventScroll: true})
			if (bar) reveal(bar)
			return
		}
	}
}

function onBarKeydown(event: KeyboardEvent, item: RowLayout, index: number) {
	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault()
		focusBar(index, event.key === 'ArrowDown' ? 1 : -1)
		return
	}
	const bar = item.row.bar
	if (editable.value && bar && !bar.derived && keyboard.onKeydown(event, item.row.id, bar)) {
		event.preventDefault()
		const target = event.target as HTMLElement
		void nextTick(() => reveal(target))
	}
}

// On a row without dates, a drag across the timeline gives the task its first dates.
function onTrackPointerDown(event: PointerEvent, row: GanttRow) {
	if (!editable.value || row.bar || event.target !== event.currentTarget) return
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
	const index = Math.min(Math.max(Math.floor((event.clientX - rect.left) / dayWidth.value), 0), days.value.length - 1)
	const day = addDays(props.range.from, index)
	drag.start(event, {id: row.id, mode: 'draw', span: {start: day, end: day}})
}

function onTrackClick(event: MouseEvent, row: GanttRow) {
	// Touch screens open the task from anywhere on its row.
	if (!hasFinePointer.value && event.target === event.currentTarget) {
		open(row)
	}
}

// --- Scrolling ----------------------------------------------------------------

function scrollToDate(date: Date, behavior: ScrollBehavior = 'smooth') {
	const element = viewport.value
	if (!element) return
	const x = dayOffset(props.range, date) * dayWidth.value
	const visible = element.clientWidth - titleWidth.value
	element.scrollTo({left: Math.max(0, x - visible * 0.2), behavior})
}

// A new range or scale opens at today when the range holds it, else at its start; once the width is known.
const scrollPending = shallowRef(true)
watch(() => [props.range.from.getTime(), props.range.to.getTime(), props.scale], () => {
	scrollPending.value = true
})
watchEffect(() => {
	if (!scrollPending.value || viewportWidth.value === 0 || !viewport.value) return
	scrollPending.value = false
	if (todayIndex.value !== null) {
		scrollToDate(props.now, 'instant')
	} else {
		viewport.value.scrollLeft = 0
	}
}, {flush: 'post'})

defineExpose({scrollToDate})
</script>

<template>
	<div
		ref="viewport"
		:class="cn(
			'relative overflow-auto overscroll-x-contain border-t border-line',
			drag.moved.value && 'cursor-grabbing select-none',
		)"
		:style="viewportStyle"
		role="region"
		:aria-label="t('projectView.gantt.chart')"
	>
		<div
			class="relative"
			:style="{width: `${titleWidth + timelineWidth}px`}"
		>
			<div
				ref="header"
				class="sticky top-0 z-20 flex border-b border-line bg-canvas"
			>
				<div
					class="sticky left-0 z-10 flex shrink-0 items-end border-e border-line bg-canvas px-3 pb-2"
					:style="{width: `${titleWidth}px`}"
				>
					<span class="caption">{{ t('projectView.gantt.tasksColumn') }}</span>
				</div>
				<GanttTimelineHeader
					:days="days"
					:day-width="dayWidth"
					:scale="scale"
					:sticky-offset="titleWidth"
					:today-index="todayIndex"
					:now-offset="nowOffset"
					:today="now"
				/>
			</div>

			<div
				class="relative"
				:style="{height: `${bodyHeight}px`}"
			>
				<!-- Keeps the title column's background and edge going below the last row. -->
				<div
					class="pointer-events-none sticky left-0 z-10 border-e border-line bg-canvas"
					:style="{width: `${titleWidth}px`, height: `${bodyHeight}px`, marginBottom: `-${bodyHeight}px`}"
					aria-hidden="true"
				/>
				<div
					class="pointer-events-none absolute inset-y-0"
					:style="{left: `${titleWidth}px`, width: `${timelineWidth}px`}"
					aria-hidden="true"
				>
					<div
						v-for="day in weekends"
						:key="day.index"
						class="absolute inset-y-0 bg-canvas-subtle"
						:style="{left: `${day.index * dayWidth}px`, width: `${dayWidth}px`}"
					/>
					<div
						v-for="line in gridLines"
						:key="line.left"
						:class="cn('absolute inset-y-0 w-px', line.tone)"
						:style="{left: `${line.left}px`}"
					/>
					<div
						v-if="nowOffset !== null"
						class="absolute inset-y-0 w-px bg-accent"
						:style="{left: `${nowOffset}px`}"
					/>
				</div>
				<GanttArrows
					v-if="arrows.length > 0"
					:arrows="arrows"
					:width="timelineWidth"
					:height="rowsHeight"
					:row-height="rowHeight"
					:style="{left: `${titleWidth}px`}"
				/>

				<div
					v-for="(item, index) in layout"
					:key="item.row.id"
					class="group/row flex"
					:style="{height: `${rowHeight}px`}"
					:data-row-index="index"
				>
					<div
						class="
							sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-e border-b border-line
							bg-canvas pe-2
							group-hover/row:bg-canvas-subtle
						"
						:style="{
							width: `${titleWidth}px`,
							paddingInlineStart: `${(isMd ? 6 : 12) + item.row.indent * (isMd ? 16 : 8)}px`,
						}"
					>
						<template v-if="isMd">
							<button
								v-if="item.row.isParent"
								type="button"
								class="
									grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-faint
									hover:bg-line hover:text-ink
									focus-visible:outline-2 focus-visible:outline-accent
								"
								:aria-expanded="!collapsed.has(item.row.id)"
								:aria-label="t(collapsed.has(item.row.id) ? 'projectView.gantt.expand' : 'projectView.gantt.collapse', {task: item.row.task.title})"
								@click="emit('toggle', item.row.id)"
							>
								<UiIcon
									:icon="ChevronRight"
									size="sm"
									:class="cn('transition-transform duration-150', !collapsed.has(item.row.id) && 'rotate-90')"
								/>
							</button>
							<span
								v-else
								class="size-5 shrink-0"
							/>
							<TaskCheck
								v-if="canWrite"
								:model-value="item.row.task.done ?? false"
								:priority="item.row.task.priority"
								:label="t(item.row.task.done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: item.row.task.title})"
								size="sm"
								@update:modelValue="done => actions.setDone(item.row.task, done)"
							/>
							<RouterLink
								:to="taskLink(item.row.id)"
								class="
									flex min-w-0 flex-1 items-baseline gap-2 rounded-sm text-base
									focus-visible:outline-2 focus-visible:outline-accent
								"
							>
								<span class="shrink-0 font-mono text-2xs text-ink-faint">{{ getTaskIdentifier(item.row.task) }}</span>
								<span
									:class="cn(
										'truncate hover:underline',
										item.row.task.done && 'text-ink-faint line-through decoration-line-strong',
									)"
								>{{ item.row.task.title }}</span>
							</RouterLink>
							<PriorityMark
								v-if="(item.row.task.priority ?? 0) >= PRIORITIES.HIGH"
								:priority="item.row.task.priority ?? 0"
							/>
						</template>
						<RouterLink
							v-else
							:to="taskLink(item.row.id)"
							class="flex min-w-0 flex-1 flex-col justify-center self-stretch"
						>
							<span :class="cn('truncate text-sm', item.row.task.done && 'text-ink-faint line-through')">{{ item.row.task.title }}</span>
							<span class="font-mono text-3xs text-ink-faint">{{ getTaskIdentifier(item.row.task) }}</span>
						</RouterLink>
					</div>

					<div
						:class="cn(
							'relative flex shrink-0 items-center border-b border-line/50 group-hover/row:bg-canvas-subtle/60',
							!hasFinePointer && 'cursor-pointer',
							editable && !item.row.bar && 'cursor-crosshair',
						)"
						:style="{width: `${timelineWidth}px`}"
						@pointerdown="event => onTrackPointerDown(event, item.row)"
						@click="event => onTrackClick(event, item.row)"
					>
						<GanttBar
							v-if="item.row.bar && item.visible"
							:task="item.row.task"
							:type="item.row.bar.type"
							:derived="item.row.bar.derived"
							:left="item.left"
							:width="item.width"
							:height="barHeight"
							:cut-start="item.cutStart"
							:cut-end="item.cutEnd"
							:editable="editable"
							:active="item.active"
							:label="barLabel(item)"
							:dates="format.span(item.span!)"
							:visible-from="scrollX"
							@drag="(event, mode) => onBarDrag(event, item.row, mode)"
							@open="onBarClick(item.row)"
							@keydown="event => onBarKeydown(event, item, index)"
							@focus="onBarFocus"
						/>
						<div
							v-else-if="!item.row.bar && item.span && item.visible"
							class="
								pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm border border-dashed
								border-accent bg-accent-subtle
							"
							:style="{left: `${item.left}px`, width: `${item.width}px`, height: `${barHeight}px`}"
						>
							<span
								class="
									absolute inset-s-0 bottom-full mb-1 rounded-sm bg-ink px-1.5 py-0.5 font-mono
									text-3xs whitespace-nowrap text-canvas
								"
							>{{ format.span(item.span) }}</span>
						</div>
						<span
							v-if="!item.row.bar && !item.span"
							class="pointer-events-none sticky font-mono text-2xs whitespace-nowrap text-ink-faint"
							:style="{left: `${titleWidth + 8}px`}"
						>
							{{ t('projectView.gantt.undated') }}<span
								v-if="editable"
								class="opacity-0 transition-opacity group-hover/row:opacity-100"
							> · {{ t('projectView.gantt.drawHint') }}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
