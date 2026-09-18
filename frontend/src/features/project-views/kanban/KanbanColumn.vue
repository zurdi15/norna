<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef, watch, type ComponentPublicInstance} from 'vue'
import {useI18n} from 'vue-i18n'
import {VueDraggable, type DraggableEvent} from 'vue-draggable-plus'
import type Sortable from 'sortablejs'
import {CheckCheck, UnfoldHorizontal} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {positionForIndex, useRenameBucketMutation, type BoardBucket} from '@/client/queries/taskBoard'
import {useBucketTasks} from '@/composables/useTaskBoard'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import AddCard from './AddCard.vue'
import BucketMenu from './BucketMenu.vue'
import KanbanCard from './KanbanCard.vue'
import {bucketCountLabel, bucketFilterFor, canDropInBucket, isBucketFull, isDoneBucket} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** One column: its header, its cards (sortable, and a drop target for other columns) and "+ Add a task". */
const props = defineProps<{
	bucket: BoardBucket
}>()

const {t} = useI18n()
const board = useKanbanBoard()
const {isMd} = useBreakpoints()
const rename = useRenameBucketMutation()

const {tasks, hasMore, isLoadingMore, loadMore} = useBucketTasks({
	projectId: board.projectId,
	viewId: board.viewId,
	params: board.params,
	bucket: () => props.bucket,
	bucketFilter: () => bucketFilterFor(board.view.value, props.bucket.id),
})

// Phones show one column at a time, so there is nothing to collapse there.
const collapsed = computed(() => isMd.value && board.isCollapsed(props.bucket.id))
const full = computed(() => isBucketFull(props.bucket))
const isDone = computed(() => isDoneBucket(board.view.value, props.bucket.id))
const countLabel = computed(() => bucketCountLabel(props.bucket))
const countTitle = computed(() => (props.bucket.limit ?? 0) > 0
	? t('kanban.countOfLimit', {count: props.bucket.count, limit: props.bucket.limit})
	: t('projectView.list.count', props.bucket.count))
const canAdd = computed(() => board.canEditBuckets.value)
// While a card is dragged, columns that won't take it step back.
const blocked = computed(() => {
	const drag = board.dragging.value
	return drag !== null && isMd.value && drag.fromBucketId !== props.bucket.id
		&& !canDropInBucket(board.mode.value, props.bucket, drag.fromBucketId)
})

// The cards as shown. Sortable reorders this copy on drop; it follows the server's order
// again once the move reaches the cache, and never mid-drag, which would pull the DOM
// out from under Sortable.
const items = ref<Task[]>([])
watch([tasks, board.syncToken], () => {
	if (board.dragging.value === null) {
		items.value = [...tasks.value]
	}
}, {immediate: true})

// Sortable's classes, styled in the template: kanban-lift is the ghost under the pointer, a
// copy of the card or column. Reka's context menu trigger sets pointer-events inline, so the
// ghost forces them off again; a ghost that catches the pointer hides every drop target.
const dragGroup = computed(() => {
	const between = board.canMoveBetween.value && isMd.value
	return {
		name: `kanban-${board.viewId.value}`,
		pull: between,
		put: () => {
			const drag = board.dragging.value
			return between && drag !== null && canDropInBucket(board.mode.value, props.bucket, drag.fromBucketId)
		},
	} satisfies Sortable.GroupOptions
})

const cards = new Map<number, InstanceType<typeof KanbanCard>>()

function setCardRef(taskId: number, card: Element | ComponentPublicInstance | null) {
	if (card) {
		cards.set(taskId, card as InstanceType<typeof KanbanCard>)
	} else {
		cards.delete(taskId)
	}
}

function taskIdOf(item: HTMLElement): number {
	return Number(item.dataset.taskId)
}

function isTouch(event: Event | undefined): boolean {
	return event !== undefined && ((event as PointerEvent).pointerType === 'touch' || event.type.startsWith('touch'))
}

// On touch, Sortable picks a card up after a long press. Lifting the finger without
// moving it makes that press open the card's menu instead of a drag.
let press: {taskId: number, dragged: boolean} | null = null

function onChoose(event: DraggableEvent & {originalEvent?: Event}) {
	press = isTouch(event.originalEvent) ? {taskId: taskIdOf(event.item), dragged: false} : null
	if (press) {
		navigator.vibrate?.(8)
	}
}

// Lifting the finger may still end in a click, on the card or on the sheet opening under it.
function swallowNextClick() {
	const swallow = (event: Event) => {
		event.preventDefault()
		event.stopPropagation()
	}
	document.addEventListener('click', swallow, {capture: true, once: true})
	setTimeout(() => document.removeEventListener('click', swallow, {capture: true}), 800)
}

function onUnchoose() {
	if (press && !press.dragged) {
		swallowNextClick()
		cards.get(press.taskId)?.openMenu()
	}
	press = null
}

function onStart(event: DraggableEvent) {
	if (press) {
		press.dragged = true
	}
	board.startDrag(taskIdOf(event.item), props.bucket.id)
}

function onEnd() {
	board.endDrag()
}

// Positions come from the server's order (`tasks`), not from the copy Sortable just edited.
function onAdd(event: DraggableEvent) {
	const taskId = taskIdOf(event.item)
	board.moveTask({
		taskId,
		fromBucketId: Number(event.from.dataset.bucketId),
		bucketId: props.bucket.id,
		position: positionForIndex(tasks.value, event.newDraggableIndex ?? event.newIndex ?? 0, taskId),
	})
}

function onUpdate(event: DraggableEvent) {
	const taskId = taskIdOf(event.item)
	board.moveTask({
		taskId,
		fromBucketId: props.bucket.id,
		bucketId: props.bucket.id,
		position: positionForIndex(tasks.value, event.newDraggableIndex ?? event.newIndex ?? 0, taskId),
	})
}

const renaming = ref(false)
const draftTitle = ref('')
const titleInput = useTemplateRef<HTMLInputElement>('titleInput')

async function startRename() {
	if (!board.canEditBuckets.value) {
		return
	}
	draftTitle.value = props.bucket.title ?? ''
	renaming.value = true
	await nextTick()
	titleInput.value?.focus()
	titleInput.value?.select()
}

function commitRename() {
	if (!renaming.value) {
		return
	}
	renaming.value = false
	const title = draftTitle.value.trim()
	if (title === '' || title === props.bucket.title) {
		return
	}
	rename.mutate({
		projectId: board.projectId.value,
		viewId: board.viewId.value,
		bucket: {id: props.bucket.id, title, limit: props.bucket.limit ?? 0, position: props.bucket.position ?? 0},
	})
}

function onTitleKeydown(event: KeyboardEvent) {
	if (event.isComposing) {
		return
	}
	if (event.key === 'Enter') {
		event.preventDefault()
		commitRename()
	} else if (event.key === 'Escape') {
		event.preventDefault()
		renaming.value = false
	}
}
</script>

<template>
	<section
		data-column
		:data-bucket-id="bucket.id"
		:aria-label="bucket.title"
		:class="cn(
			'flex max-h-full shrink-0 flex-col rounded-lg bg-canvas-subtle transition-opacity duration-150',
			collapsed ? 'w-11' : 'w-[86vw] max-md:snap-start md:w-72',
			blocked && 'opacity-45',
			'[&.kanban-column-placeholder]:opacity-40 [&.kanban-lift]:-rotate-1 [&.kanban-lift]:shadow-overlay',
			'[&.kanban-lift]:opacity-100! [&.kanban-lift_*]:pointer-events-none!',
		)"
	>
		<button
			v-if="collapsed"
			type="button"
			:aria-label="t('kanban.expand', {title: bucket.title})"
			aria-expanded="false"
			data-column-handle
			class="
				flex cursor-pointer flex-col items-center gap-2.5 rounded-lg px-1 py-3 text-ink-muted transition-colors
				hover:bg-surface hover:text-ink
			"
			@click="board.setCollapsed(bucket.id, false)"
		>
			<UiIcon
				:icon="UnfoldHorizontal"
				size="sm"
				class="text-ink-faint"
			/>
			<span
				:class="cn('font-mono text-2xs tabular-nums', full ? 'text-warning' : 'text-ink-faint')"
				:title="countTitle"
			>{{ countLabel }}</span>
			<span class="max-h-64 truncate text-sm font-semibold text-ink [writing-mode:vertical-rl]">{{ bucket.title }}</span>
		</button>

		<template v-else>
			<header
				:data-column-handle="board.canEditBuckets.value || undefined"
				:class="cn(
					'flex h-10 shrink-0 items-center gap-2 ps-3 pe-1 pointer-coarse:h-12',
					board.canEditBuckets.value && 'md:cursor-grab md:active:cursor-grabbing',
				)"
			>
				<input
					v-if="renaming"
					ref="titleInput"
					v-model="draftTitle"
					type="text"
					enterkeyhint="done"
					:aria-label="t('kanban.columnTitle')"
					class="
						-ms-1.5 h-7 min-w-0 flex-1 rounded-sm border border-accent bg-surface px-1.5 text-sm
						font-semibold ring-3 ring-accent/20
						focus:outline-none
						pointer-coarse:h-9 pointer-coarse:text-lg
					"
					@keydown="onTitleKeydown"
					@blur="commitRename"
				>
				<template v-else>
					<h3
						class="min-w-0 truncate text-sm font-semibold"
						:title="bucket.title"
						@dblclick="startRename"
					>
						{{ bucket.title }}
					</h3>
					<UiIcon
						v-if="isDone"
						:icon="CheckCheck"
						:label="t('kanban.doneColumnHint')"
						size="sm"
						class="shrink-0 text-success"
					/>
					<span
						:class="cn(
							'shrink-0 rounded-sm font-mono text-2xs tabular-nums',
							full ? 'bg-warning-subtle px-1 text-warning' : 'text-ink-faint',
						)"
						:title="countTitle"
					>{{ countLabel }}</span>
					<span class="flex-1" />
					<BucketMenu
						:bucket="bucket"
						:collapsible="isMd"
						@rename="startRename"
						@collapse="board.setCollapsed(bucket.id, true)"
					/>
				</template>
			</header>

			<div class="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-1">
				<VueDraggable
					v-model="items"
					tag="ul"
					role="list"
					:data-bucket-id="bucket.id"
					:aria-label="bucket.title"
					:group="dragGroup"
					:disabled="!board.canWrite.value"
					:animation="150"
					:force-fallback="true"
					:fallback-on-body="true"
					:fallback-tolerance="5"
					:delay="350"
					:delay-on-touch-only="true"
					:touch-start-threshold="6"
					filter="button, input, textarea, [data-no-drag]"
					:prevent-on-filter="false"
					ghost-class="kanban-placeholder"
					chosen-class="kanban-chosen"
					fallback-class="kanban-lift"
					:scroll-sensitivity="64"
					:empty-insert-threshold="32"
					class="flex min-h-12 flex-col gap-2 pb-1"
					@choose="onChoose"
					@unchoose="onUnchoose"
					@start="onStart"
					@end="onEnd"
					@add="onAdd"
					@update="onUpdate"
				>
					<li
						v-for="task in items"
						:key="task.id"
						:data-task-id="task.id"
						class="
							list-none rounded-lg transition-transform duration-150
							pointer-coarse:[&.kanban-chosen]:scale-[1.02]
							[&.kanban-lift]:rotate-[-1.2deg] [&.kanban-lift]:opacity-100!
							[&.kanban-lift]:transition-none
							[&.kanban-lift_*]:pointer-events-none!
							[&.kanban-placeholder]:bg-accent-subtle [&.kanban-placeholder]:outline-1
							[&.kanban-placeholder]:-outline-offset-1 [&.kanban-placeholder]:outline-accent-line
							[&.kanban-placeholder]:outline-dashed
							[&.kanban-placeholder>*]:invisible
						"
					>
						<KanbanCard
							:ref="card => setCardRef(task.id ?? 0, card)"
							:task="task"
							:bucket-id="bucket.id"
						/>
					</li>
				</VueDraggable>
				<p
					v-if="!items.length && !board.dragging.value"
					class="pointer-events-none absolute inset-x-2 top-0 grid h-12 place-items-center text-xs text-ink-faint"
				>
					{{ t('kanban.columnEmpty') }}
				</p>
				<button
					v-if="hasMore"
					type="button"
					:aria-busy="isLoadingMore || undefined"
					class="
						mb-1 flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-xs
						text-ink-muted transition-colors
						hover:bg-surface hover:text-ink
						pointer-coarse:h-11 pointer-coarse:text-sm
					"
					@click="loadMore"
				>
					<UiSpinner v-if="isLoadingMore" />
					{{ t('kanban.loadMore') }}
				</button>
			</div>

			<footer
				v-if="canAdd"
				class="shrink-0 px-2 pt-0.5 pb-2"
			>
				<AddCard
					:bucket-id="bucket.id"
					:tasks="tasks"
					:full="full"
				/>
			</footer>
		</template>
	</section>
</template>
