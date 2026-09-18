<script setup lang="ts">
import {computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useEventListener, useResizeObserver, useScroll} from '@vueuse/core'
import {VueDraggable, type DraggableEvent} from 'vue-draggable-plus'

import type {ProjectView, Task} from '@/client/generated'
import type {ProjectResponse} from '@/client/queries/projects'
import {
	positionForIndex,
	useMoveTaskMutation,
	useReorderBucketMutation,
	type BoardBucket,
} from '@/client/queries/taskBoard'
import type {TaskBoardParams} from '@/client/queries/tasks'
import {useTaskBoard} from '@/composables/useTaskBoard'
import {getCollapsedBucketState, saveCollapsedBucketState, type CollapsedBuckets} from '@/helpers/saveCollapsedBucketState'
import {success} from '@/message'
import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'

import type {ViewFilters} from '../useViewFilters'
import AddColumn from './AddColumn.vue'
import ColumnChips from './ColumnChips.vue'
import KanbanColumn from './KanbanColumn.vue'
import KanbanSkeleton from './KanbanSkeleton.vue'
import MoveToDialog from './MoveToDialog.vue'
import {bucketMode, nearestColumnIndex, topPosition} from './kanban'
import {provideKanbanBoard, useCardDrag, type CardMove} from './useKanbanBoard'

/**
 * A project's tasks as a board: columns side by side on wide screens, dragged between;
 * one column per screen on phones, with chips to jump and "Move to…" instead of a drag.
 */
const props = defineProps<{
	project: ProjectResponse
	view: ProjectView
	filters: ViewFilters
	canWrite: boolean
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const {isMd} = useBreakpoints()

const projectId = computed(() => props.project.id)
const viewId = computed(() => props.view.id ?? 0)
const mode = computed(() => bucketMode(props.view))
const params = computed<TaskBoardParams>(() => ({
	q: props.filters.q,
	filter: props.filters.filter,
	filter_include_nulls: props.filters.filter_include_nulls || undefined,
	filter_timezone: props.filters.filter ? authStore.settings.timezone : undefined,
}))

const board = useTaskBoard(projectId, viewId, params)
// Another search or filter is another query: the last board stays up until it answers,
// instead of the skeleton flashing on every search.
const lastBuckets = shallowRef<BoardBucket[]>([])
watch(board.buckets, current => {
	if (!board.isPending.value) {
		lastBuckets.value = current
	}
}, {immediate: true})
const refreshing = computed(() => board.isPending.value && lastBuckets.value.length > 0)
const buckets = computed(() => refreshing.value ? lastBuckets.value : board.buckets.value)
const canWrite = computed(() => props.canWrite)
const canEditBuckets = computed(() => props.canWrite && mode.value === 'manual')

const drag = useCardDrag()
const moveMutation = useMoveTaskMutation()

function moveTask(move: CardMove) {
	drag.markMoved()
	moveMutation.mutate({projectId: projectId.value, viewId: viewId.value, ...move}, {
		onSettled: () => drag.syncToken.value++,
	})
}

const collapsed = ref<CollapsedBuckets>({})
watch(projectId, id => {
	collapsed.value = getCollapsedBucketState(id)
}, {immediate: true})

function setCollapsed(bucketId: number, value: boolean) {
	collapsed.value = {...collapsed.value, [bucketId]: value}
	saveCollapsedBucketState(projectId.value, collapsed.value)
}

// "Move to…" is picked from a menu; the dialog opens once that menu has closed.
const moveTarget = shallowRef<{task: Task, bucketId: number} | null>(null)
const moveOpen = ref(false)

async function openMoveTo(task: Task, bucketId: number) {
	moveTarget.value = {task, bucketId}
	await nextTick()
	moveOpen.value = true
}

function moveToBucket(bucket: BoardBucket) {
	const target = moveTarget.value
	const taskId = target?.task.id
	if (!target || taskId === undefined) {
		return
	}
	const {task, bucketId: fromBucketId} = target
	moveTask({taskId, fromBucketId, bucketId: bucket.id, position: topPosition(bucket.tasks, taskId)})
	success({message: t('kanban.moved', {title: task.title, column: bucket.title})}, [{
		title: t('tasks.actions.undo'),
		callback: () => moveTask({taskId, fromBucketId: bucket.id, bucketId: fromBucketId, position: task.position ?? 0}),
	}])
}

provideKanbanBoard({
	projectId,
	viewId,
	view: computed(() => props.view),
	mode,
	params,
	buckets,
	canWrite,
	canEditBuckets,
	canMoveBetween: canEditBuckets,
	dragging: drag.dragging,
	syncToken: drag.syncToken,
	startDrag: drag.startDrag,
	endDrag: drag.endDrag,
	moveTask,
	openMoveTo: (task, bucketId) => void openMoveTo(task, bucketId),
	isCollapsed: bucketId => collapsed.value[bucketId] === true,
	setCollapsed,
	isClickSuppressed: drag.isClickSuppressed,
})

// Columns in the order shown; Sortable reorders this copy when a header is dragged.
const columns = ref<BoardBucket[]>([])
const draggingColumn = ref(false)
watch(buckets, current => {
	if (!draggingColumn.value) {
		columns.value = [...current]
	}
}, {immediate: true})

const reorder = useReorderBucketMutation()

function onColumnDrop(event: DraggableEvent) {
	const bucketId = Number(event.item.dataset.bucketId)
	const bucket = buckets.value.find(candidate => candidate.id === bucketId)
	if (!bucket) {
		return
	}
	reorder.mutate({
		projectId: projectId.value,
		viewId: viewId.value,
		bucket: {
			id: bucket.id,
			title: bucket.title ?? '',
			limit: bucket.limit ?? 0,
			position: positionForIndex(buckets.value, event.newDraggableIndex ?? event.newIndex ?? 0, bucket.id),
		},
	})
}

function onColumnDragEnd() {
	draggingColumn.value = false
	drag.suppressClick()
}

// The board fills the screen below the page header (and above the phone's tab bar);
// columns scroll on their own inside it.
const root = useTemplateRef<HTMLElement>('root')
const top = ref(0)

function measure() {
	if (root.value) {
		top.value = Math.round(root.value.getBoundingClientRect().top + window.scrollY)
	}
}

onMounted(measure)
useEventListener(window, 'resize', measure)
// The header above can change height (fonts, the phone's search row): the page grows with it.
useResizeObserver(() => document.body, measure)

const scroller = useTemplateRef<HTMLElement>('scroller')
const {x: scrollX} = useScroll(scroller)

function columnElements(): HTMLElement[] {
	return [...(scroller.value?.querySelectorAll<HTMLElement>('[data-column]') ?? [])]
}

const activeColumn = computed(() => {
	const elements = columnElements()
	const first = elements[0]?.offsetLeft ?? 0
	return nearestColumnIndex(scrollX.value, elements.map(element => element.offsetLeft - first))
})

function scrollToColumn(index: number) {
	const elements = columnElements()
	const target = elements[index]
	if (target) {
		scroller.value?.scrollTo({left: target.offsetLeft - (elements[0]?.offsetLeft ?? 0), behavior: 'smooth'})
	}
}

async function onColumnCreated() {
	await nextTick()
	scroller.value?.scrollTo({left: scroller.value.scrollWidth, behavior: 'smooth'})
}

const state = computed(() => {
	if (board.isPending.value && !refreshing.value) {
		return 'loading'
	}
	if (board.error.value && buckets.value.length === 0) {
		return 'error'
	}
	return buckets.value.length === 0 ? 'empty' : 'board'
})
</script>

<template>
	<div
		ref="root"
		class="flex min-h-80 flex-col [--kanban-bottom:calc(3.75rem+env(safe-area-inset-bottom))] md:[--kanban-bottom:0px]"
		:style="{height: `calc(100dvh - ${top}px - var(--kanban-bottom))`}"
	>
		<KanbanSkeleton v-if="state === 'loading'" />

		<UiEmptyState
			v-else-if="state === 'error'"
			:title="t('kanban.loadFailed')"
			:description="t('kanban.loadFailedDescription')"
			class="py-20"
		>
			<template #actions>
				<UiButton @click="board.refetch()">
					{{ t('agenda.retry') }}
				</UiButton>
			</template>
		</UiEmptyState>

		<UiEmptyState
			v-else-if="state === 'empty'"
			:title="t('kanban.empty')"
			:description="canEditBuckets ? t('kanban.emptyDescription') : t('kanban.emptyReadOnly')"
			class="py-20"
		>
			<template
				v-if="canEditBuckets"
				#actions
			>
				<div class="w-72">
					<AddColumn prominent />
				</div>
			</template>
		</UiEmptyState>

		<template v-else>
			<ColumnChips
				v-if="!isMd"
				:buckets="columns"
				:active="activeColumn"
				@select="scrollToColumn"
			/>
			<div
				ref="scroller"
				:aria-busy="refreshing || undefined"
				:class="cn(
					'relative flex min-h-0 flex-1 items-start gap-2.5 overflow-x-auto overscroll-x-contain px-4 pt-2 pb-4',
					'transition-opacity duration-150 max-md:snap-x max-md:snap-mandatory max-md:scroll-px-4',
					'md:gap-3 md:pt-3 lg:px-6',
					refreshing && 'opacity-60',
				)"
			>
				<VueDraggable
					v-model="columns"
					:disabled="!canEditBuckets || !isMd"
					handle="[data-column-handle]"
					filter="input, [data-no-drag]"
					:prevent-on-filter="false"
					direction="horizontal"
					:animation="150"
					:force-fallback="true"
					:fallback-on-body="true"
					:fallback-tolerance="5"
					:delay="350"
					:delay-on-touch-only="true"
					ghost-class="kanban-column-placeholder"
					fallback-class="kanban-lift"
					:group="`kanban-columns-${viewId}`"
					class="flex h-full shrink-0 items-start gap-2.5 md:gap-3"
					@start="draggingColumn = true"
					@update="onColumnDrop"
					@end="onColumnDragEnd"
				>
					<KanbanColumn
						v-for="bucket in columns"
						:key="bucket.id"
						:bucket="bucket"
					/>
				</VueDraggable>
				<div
					v-if="canEditBuckets"
					class="w-[86vw] shrink-0 max-md:snap-start md:w-72"
				>
					<AddColumn @created="onColumnCreated" />
				</div>
			</div>
		</template>

		<MoveToDialog
			v-model:open="moveOpen"
			:task="moveTarget?.task ?? null"
			:bucket-id="moveTarget?.bucketId ?? 0"
			@select="moveToBucket"
		/>
	</div>
</template>
