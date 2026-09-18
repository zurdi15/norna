<script setup lang="ts">
import {computed, ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useStorage} from '@vueuse/core'
import {ChartGantt, ChevronLeft, ChevronRight, SearchX} from '@lucide/vue'

import type {ProjectView, Task} from '@/client/generated'
import type {ProjectResponse} from '@/client/queries/projects'
import type {TaskPatch} from '@/client/queries/tasks'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {success} from '@/message'
import {useAuthStore} from '@/stores/auth'
import {useTaskActionsStore} from '@/stores/taskActions'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSeparator from '@/ui/UiSeparator.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import type {ViewFilters} from '../useViewFilters'
import GanttChart from './GanttChart.vue'
import GanttRangeMenu from './GanttRangeMenu.vue'
import {previousDates} from './ganttBars'
import {DEFAULT_RANGE_PRESET, presetRange, rangeContains, shiftRange} from './ganttRange'
import {buildGanttRows, type GanttSortKey} from './ganttRows'
import {GANTT_SCALES, type GanttScale} from './ganttTimeline'
import {ganttTaskParams, useGanttFilters} from './useGanttFilters'
import {useGanttTaskList} from './useGanttTaskList'

/**
 * The tasks of a view on a timeline. The range and the "tasks without dates" toggle
 * live in the url; the page's search and filter narrow the tasks further.
 */
const props = defineProps<{
	project: ProjectResponse
	view: ProjectView
	filters: ViewFilters
	canWrite: boolean
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const actions = useTaskActionsStore()
const {now} = useGlobalNow()
const {isMd} = useBreakpoints()

const {filters: gantt, range, showTasksWithoutDates} = useGanttFilters()
// Per viewer, like the table's columns.
const storedScale = useStorage<string>('norna:gantt-scale', 'day')
const scale = computed<GanttScale>({
	get: () => GANTT_SCALES.find(value => value === storedScale.value) ?? 'day',
	set: value => {
		storedScale.value = value
	},
})
const scales = computed(() => GANTT_SCALES.map(value => ({value, label: t(`projectView.gantt.scales.${value}`)})))

const list = useGanttTaskList(
	() => ({kind: 'view', projectId: props.project.id, viewId: props.view.id ?? 0}),
	() => ganttTaskParams(gantt.value, props.filters, {
		timezone: authStore.settings.timezone,
		// The Favorites pseudo project mixes projects, so its tasks can't nest.
		subtasks: props.project.id !== -1,
	}),
)

const collapsed = ref<ReadonlySet<number>>(new Set())
function toggle(id: number) {
	const next = new Set(collapsed.value)
	if (!next.delete(id)) {
		next.add(id)
	}
	collapsed.value = next
}

// Rows keep the order they had when the range or filters were last set; edits don't reshuffle them.
let sortKeys = new Map<number, GanttSortKey>()
watch(() => [
	range.value.from.getTime(),
	range.value.to.getTime(),
	showTasksWithoutDates.value,
	props.filters.filter,
	props.filters.q,
	props.filters.filter_include_nulls,
], () => {
	sortKeys = new Map()
})

const chartRows = computed(() => buildGanttRows(list.tasks.value, {
	range: range.value,
	showUndated: showTasksWithoutDates.value,
	collapsed: collapsed.value,
	sortKeys,
}))

const filtering = computed(() => props.filters.q !== '' || props.filters.filter !== '')

const chart = useTemplateRef<InstanceType<typeof GanttChart>>('chart')

function goToToday() {
	if (rangeContains(range.value, now.value)) {
		chart.value?.scrollToDate(now.value)
	} else {
		range.value = presetRange(DEFAULT_RANGE_PRESET, now.value)
	}
}

async function update(task: Task, patch: TaskPatch) {
	const previous = previousDates(task, patch)
	if (await list.updateTask(task, patch)) {
		success({message: t('projectView.gantt.datesChanged', {title: task.title})}, [{
			title: t('tasks.actions.undo'),
			// Through the store: the undo still works after leaving the chart.
			callback: () => void actions.update(task, previous),
		}])
	}
}

// Bars at staggered places, so the placeholder reads as a timeline.
const SKELETON_BARS = [[4, 22], [14, 30], [9, 12], [30, 26], [42, 18], [22, 34], [55, 20]] as const
const SKELETON_TITLES = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4', 'w-1/2', 'w-2/3', 'w-3/5'] as const
</script>

<template>
	<div class="@container">
		<div class="flex items-center gap-1.5 px-3 py-2 @xl:px-5">
			<div class="flex min-w-0 items-center gap-0.5">
				<UiIconButton
					:icon="ChevronLeft"
					:label="t('projectView.gantt.previous')"
					size="sm"
					class="pointer-coarse:size-10"
					@click="range = shiftRange(range, -1)"
				/>
				<GanttRangeMenu
					v-model:range="range"
					:now="now"
				>
					<template v-if="!isMd">
						<UiSeparator />
						<div class="grid gap-3 px-1 pt-1">
							<p class="px-1 caption">
								{{ t('projectView.gantt.scale') }}
							</p>
							<UiSegmented
								v-model="scale"
								:items="scales"
								:label="t('projectView.gantt.scale')"
								class="grid grid-cols-2"
							/>
							<label class="flex min-h-11 items-center justify-between gap-3 px-1 text-md">
								{{ t('projectView.gantt.showUndated') }}
								<UiSwitch v-model="showTasksWithoutDates" />
							</label>
						</div>
					</template>
				</GanttRangeMenu>
				<UiIconButton
					:icon="ChevronRight"
					:label="t('projectView.gantt.next')"
					size="sm"
					class="pointer-coarse:size-10"
					@click="range = shiftRange(range, 1)"
				/>
			</div>
			<UiButton
				variant="ghost"
				size="sm"
				class="pointer-coarse:h-10"
				@click="goToToday"
			>
				{{ t('projectView.gantt.today') }}
			</UiButton>
			<UiSpinner
				v-if="list.isFetching.value && !list.isPending.value"
				class="size-3.5 text-ink-faint"
			/>
			<span class="flex-1" />
			<template v-if="isMd">
				<label class="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
					<UiSwitch v-model="showTasksWithoutDates" />
					{{ t('projectView.gantt.showUndated') }}
				</label>
				<UiSegmented
					v-model="scale"
					:items="scales"
					:label="t('projectView.gantt.scale')"
					size="sm"
					class="ms-2"
				/>
			</template>
		</div>

		<div
			v-if="list.isPending.value"
			class="border-t border-line"
			role="status"
			:aria-label="t('tasks.list.loading')"
		>
			<div class="h-14.5 border-b border-line" />
			<div
				v-for="([left, width], index) in SKELETON_BARS"
				:key="index"
				class="flex h-9 items-center pointer-coarse:h-11"
			>
				<div class="flex h-full w-33 shrink-0 items-center border-e border-b border-line px-3 md:w-74">
					<UiSkeleton
						class="h-3.5"
						:class="[SKELETON_TITLES[index]]"
					/>
				</div>
				<div class="relative h-full flex-1 border-b border-line/50">
					<UiSkeleton
						class="absolute top-1/2 h-5.5 -translate-y-1/2 rounded-sm"
						:style="{left: `${left}%`, width: `${width}%`}"
					/>
				</div>
			</div>
		</div>
		<UiEmptyState
			v-else-if="chartRows.rows.length === 0"
			:title="filtering ? t('projectView.list.noMatches') : t('projectView.gantt.empty')"
			:description="filtering ? t('projectView.list.noMatchesDescription') : t('projectView.gantt.emptyDescription')"
			class="border-t border-line py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="filtering ? SearchX : ChartGantt"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
			<template
				v-if="!showTasksWithoutDates"
				#actions
			>
				<UiButton
					size="sm"
					class="pointer-coarse:h-10"
					@click="showTasksWithoutDates = true"
				>
					{{ t('projectView.gantt.showUndated') }}
				</UiButton>
			</template>
		</UiEmptyState>
		<GanttChart
			v-else
			ref="chart"
			:rows="chartRows.rows"
			:tasks="chartRows.tasks"
			:hidden-to-ancestor="chartRows.hiddenToAncestor"
			:collapsed="collapsed"
			:range="range"
			:scale="scale"
			:now="now"
			:can-write="canWrite"
			@update="update"
			@toggle="toggle"
		/>
	</div>
</template>
