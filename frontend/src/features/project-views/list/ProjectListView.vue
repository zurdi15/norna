<script setup lang="ts">
import {computed, ref, shallowRef, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useIntersectionObserver} from '@vueuse/core'
import {VueDraggable} from 'vue-draggable-plus'
import {ListTodo, SearchX} from '@lucide/vue'

import type {Task} from '@/client/generated'
import type {ProjectView} from '@/client/generated'
import type {ProjectResponse} from '@/client/queries/projects'
import {useUpdateTaskPositionMutation} from '@/client/queries/tasks'
import {useInfiniteTaskList} from '@/composables/useTaskList'
import {PERMISSIONS} from '@/constants/permissions'
import TaskListSkeleton from '@/features/tasks/TaskListSkeleton.vue'
import TaskRow from '@/features/tasks/TaskRow.vue'
import {provideTaskSelection} from '@/features/tasks/selection'
import TaskSelectionBar from '@/features/tasks/TaskSelectionBar.vue'
import {useTaskListKeyboard} from '@/features/tasks/useTaskListKeyboard'
import {calculateItemPosition} from '@/helpers/calculateItemPosition'
import {nestTasks} from '@/modules/task/listNesting'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import type {ViewFilters} from '../useViewFilters'
import ListComposer from './ListComposer.vue'
import ListSortMenu from './ListSortMenu.vue'

/**
 * A project's tasks as one long list: subtasks nested under their parent, more
 * loaded while scrolling, and, when sorted by hand, reordered by dragging.
 */
const props = defineProps<{
	project: ProjectResponse
	view: ProjectView
	filters: ViewFilters
	canWrite: boolean
}>()

const {t} = useI18n()
const {hasFinePointer} = useBreakpoints()
const updatePosition = useUpdateTaskPositionMutation()

const list = useInfiniteTaskList(() => ({kind: 'view', projectId: props.project.id, viewId: props.view.id ?? 0}), {
	sortByDefault: {position: 'asc'},
	// The Favorites pseudo project mixes projects, so its tasks can't nest.
	expand: () => props.project.id === -1 ? ['comment_count', 'is_unread'] : ['subtasks', 'comment_count', 'is_unread'],
})

// A copy the drag can reorder in place while the server catches up.
const items = shallowRef<{task: Task, subtasks: Task[]}[]>([])
watch(list.tasks, tasks => {
	items.value = nestTasks(tasks)
}, {immediate: true})

const allShown = computed(() => items.value.flatMap(({task, subtasks}) => [task, ...subtasks]))
// canWrite is about the list itself (adding, ordering). The tasks of a saved filter or
// of Favorites live in their own projects and change there; only a real project shared
// read-only makes its tasks read-only.
const readOnly = computed(() => props.project.id > 0 && (props.project.max_permission ?? PERMISSIONS.READ) < PERMISSIONS.READ_WRITE)
const selection = provideTaskSelection()
const {activeId} = useTaskListKeyboard(allShown, computed(() => true), task => {
	if (!readOnly.value) {
		selection.toggle(task)
	}
})

const sortedByHand = computed(() => {
	const fields = Object.keys(list.sortByParam.value)
	return fields.length === 1 && fields[0] === 'position'
})
const filtering = computed(() => props.filters.q !== '' || props.filters.filter !== '')
// Dragging only means something in the manual order of the whole list.
const canDrag = computed(() => props.canWrite && hasFinePointer.value && sortedByHand.value && !props.filters.q)

function onDrop(event: {oldIndex?: number, newIndex?: number}) {
	const index = event.newIndex
	if (index === undefined || index === event.oldIndex) {
		return
	}
	const moved = items.value[index]?.task
	if (!moved?.id || props.view.id === undefined) {
		return
	}
	const position = calculateItemPosition(
		items.value[index - 1]?.task.position ?? null,
		items.value[index + 1]?.task.position ?? null,
	)
	items.value = items.value.map(item => item.task.id === moved.id ? {...item, task: {...item.task, position}} : item)
	updatePosition.mutate({taskId: moved.id, viewId: props.view.id, position})
}

// Loads the next page as the end of the list scrolls into view.
const sentinel = useTemplateRef<HTMLElement>('sentinel')
useIntersectionObserver(sentinel, ([entry]) => {
	if (entry?.isIntersecting && list.hasMore.value && !list.isLoadingMore.value) {
		void list.loadMore()
	}
}, {rootMargin: '400px'})

const dragging = ref(false)
</script>

<template>
	<div class="@container pb-10">
		<div class="flex items-center gap-3 px-4 pt-3 pb-1 @xl:px-6">
			<ListComposer
				v-if="canWrite"
				:project-id="project.id"
				class="min-w-0 flex-1"
			/>
			<span
				v-else
				class="flex-1"
			/>
			<span
				v-if="!list.isPending.value"
				class="shrink-0 font-mono text-2xs text-ink-faint tabular-nums"
			>{{ t('projectView.list.count', list.total.value) }}</span>
			<ListSortMenu v-model="list.sortByParam.value" />
		</div>

		<TaskListSkeleton v-if="list.isPending.value" />
		<UiEmptyState
			v-else-if="!items.length"
			:title="filtering ? t('projectView.list.noMatches') : t('projectView.list.empty')"
			:description="filtering ? t('projectView.list.noMatchesDescription') : t('projectView.list.emptyDescription')"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="filtering ? SearchX : ListTodo"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<VueDraggable
			v-else
			v-model="items"
			tag="ul"
			role="list"
			:disabled="!canDrag"
			:animation="150"
			ghost-class="opacity-40"
			:class="cn(dragging && '[&_a]:pointer-events-none')"
			@start="dragging = true"
			@end="event => { dragging = false; onDrop(event) }"
		>
			<li
				v-for="{task, subtasks} in items"
				:key="task.id"
				:data-task-row="task.id"
				class="
					relative isolate
					before:absolute before:inset-s-11.5 before:inset-e-0 before:top-0 before:z-10 before:h-px
					before:bg-line
					first:before:hidden
				"
			>
				<TaskRow
					:task="task"
					:show-project="project.id < 0"
					:active="activeId === task.id"
					:read-only="readOnly"
					:class="canDrag && 'cursor-grab active:cursor-grabbing'"
				/>
				<ul
					v-if="subtasks.length"
					role="list"
					class="ms-8 border-s border-line"
				>
					<li
						v-for="subtask in subtasks"
						:key="subtask.id"
						:data-task-row="subtask.id"
					>
						<TaskRow
							:task="subtask"
							:show-project="project.id < 0"
							:active="activeId === subtask.id"
							:read-only="readOnly"
						/>
					</li>
				</ul>
			</li>
		</VueDraggable>
		<TaskSelectionBar
			v-if="!readOnly"
			:selection="selection"
		/>
		<div
			ref="sentinel"
			class="flex h-12 items-center justify-center"
		>
			<UiSpinner v-if="list.isLoadingMore.value" />
		</div>
	</div>
</template>
