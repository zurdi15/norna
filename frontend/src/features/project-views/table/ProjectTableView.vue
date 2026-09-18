<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useStorage} from '@vueuse/core'
import {ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MessageSquare, SearchX, Table2} from '@lucide/vue'

import type {ProjectView} from '@/client/generated'
import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {useTaskList, type SortBy} from '@/composables/useTaskList'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import PriorityMark from '@/features/tasks/PriorityMark.vue'
import {priorityLabelKey} from '@/features/tasks/priority'
import TaskCheck from '@/features/tasks/TaskCheck.vue'
import TaskDue from '@/features/tasks/TaskDue.vue'
import {useTaskLink} from '@/features/tasks/useTaskLink'
import {formatDateSince} from '@/helpers/time/formatDate'
import {getTaskDate, getTaskIdentifier} from '@/modules/task/task'
import {getDisplayName} from '@/modules/user/displayName'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiProgress from '@/ui/UiProgress.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import type {ViewFilters} from '../useViewFilters'
import {defaultVisibleColumns, nextSort, TABLE_COLUMNS, type TableColumnKey} from './columns'
import TableColumnPicker from './TableColumnPicker.vue'

/**
 * Tasks as a sortable table. The title column stays put while the rest scrolls
 * sideways, which is how a wide table stays usable on a phone.
 */
const props = defineProps<{
	project: ProjectResponse
	view: ProjectView
	filters: ViewFilters
	canWrite: boolean
}>()

const {t} = useI18n()
const projects = useProjects()
const dates = useTaskDateFormat()
const actions = useTaskActionsStore()
const taskLink = useTaskLink()

const list = useTaskList(() => ({kind: 'view', projectId: props.project.id, viewId: props.view.id ?? 0}), {
	sortByDefault: {index: 'desc'},
	expand: ['comment_count', 'is_unread'],
})

const visible = useStorage<TableColumnKey[]>('norna:table-columns', defaultVisibleColumns())
const columns = computed(() => TABLE_COLUMNS.filter(column => column.required || visible.value.includes(column.key)))

const filtering = computed(() => props.filters.q !== '' || props.filters.filter !== '')

function sortBy(field: keyof SortBy, event: MouseEvent) {
	list.sortByParam.value = nextSort(list.sortByParam.value, field, event.metaKey || event.ctrlKey || event.shiftKey)
}

function ariaSort(field: keyof SortBy | undefined): 'ascending' | 'descending' | undefined {
	const order = field ? list.sortByParam.value[field] : undefined
	return order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : undefined
}

const cellClass = 'h-10 border-b border-line px-3 text-start align-middle whitespace-nowrap pointer-coarse:h-12'
// The title column stays in view while scrolling sideways.
const stickyClass = 'sticky inset-s-0 z-10 bg-canvas'
</script>

<template>
	<div class="@container pb-10">
		<div class="flex items-center gap-3 px-4 pt-3 pb-2 @xl:px-6">
			<span
				v-if="!list.isPending.value"
				class="font-mono text-2xs text-ink-faint tabular-nums"
			>{{ t('projectView.table.page', {page: list.currentPage.value, pages: list.totalPages.value}) }}</span>
			<span class="flex-1" />
			<TableColumnPicker v-model="visible" />
		</div>

		<div
			v-if="list.isPending.value"
			class="grid gap-2 px-6 pt-2"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 8"
				:key="index"
				class="h-8"
			/>
		</div>
		<UiEmptyState
			v-else-if="!list.tasks.value.length"
			:title="filtering ? t('projectView.list.noMatches') : t('projectView.list.empty')"
			:description="filtering ? t('projectView.list.noMatchesDescription') : undefined"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="filtering ? SearchX : Table2"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<div
			v-else
			class="overflow-x-auto overscroll-x-contain"
		>
			<table class="w-full border-separate border-spacing-0 text-base pointer-coarse:text-md">
				<thead>
					<tr>
						<th
							v-for="column in columns"
							:key="column.key"
							scope="col"
							:aria-sort="ariaSort(column.sort)"
							:class="cn(
								cellClass,
								'h-9 bg-canvas text-xs font-medium text-ink-faint',
								column.key === 'title' && [stickyClass, 'min-w-56 @xl:min-w-80'],
								column.key === 'done' && 'w-10 pe-0',
							)"
						>
							<span
								v-if="column.key === 'done'"
								class="sr-only"
							>{{ t('projectView.table.column.done') }}</span>
							<button
								v-else-if="column.sort"
								type="button"
								class="
									inline-flex cursor-pointer items-center gap-1 rounded-sm
									hover:text-ink
									focus-visible:outline-2 focus-visible:outline-accent
								"
								@click="event => sortBy(column.sort!, event)"
							>
								{{ t(`projectView.table.column.${column.key}`) }}
								<UiIcon
									v-if="list.sortByParam.value[column.sort] === 'asc' || list.sortByParam.value[column.sort] === 'desc'"
									:icon="list.sortByParam.value[column.sort] === 'asc' ? ArrowUp : ArrowDown"
									size="xs"
									class="text-accent"
								/>
							</button>
							<template v-else>
								{{ t(`projectView.table.column.${column.key}`) }}
							</template>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="task in list.tasks.value"
						:key="task.id"
						class="group/tr"
					>
						<td
							v-for="column in columns"
							:key="column.key"
							:class="cn(
								cellClass,
								'group-hover/tr:bg-canvas-subtle',
								column.key === 'title' && [stickyClass, 'max-w-96 truncate'],
								column.key === 'done' && 'w-10 pe-0',
							)"
						>
							<TaskCheck
								v-if="column.key === 'done'"
								:model-value="task.done ?? false"
								:priority="task.priority"
								:label="t(task.done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: task.title})"
								:disabled="!canWrite"
								size="sm"
								@update:modelValue="done => actions.setDone(task, done)"
							/>
							<span
								v-else-if="column.key === 'identifier'"
								class="font-mono text-2xs text-ink-faint"
							>{{ getTaskIdentifier(task) }}</span>
							<RouterLink
								v-else-if="column.key === 'title'"
								:to="taskLink(task.id ?? 0)"
								:class="cn(
									'rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-accent',
									task.done && 'text-ink-faint line-through decoration-line-strong',
								)"
							>
								{{ task.title }}
							</RouterLink>
							<span
								v-else-if="column.key === 'project' && projects.projects[task.project_id ?? 0]"
								class="inline-flex items-center gap-1.5 text-sm text-ink-muted"
							>
								<UiColorDot :color="projects.projects[task.project_id ?? 0]?.hex_color" />
								{{ projects.projects[task.project_id ?? 0]?.title }}
							</span>
							<span
								v-else-if="column.key === 'priority' && (task.priority ?? 0) > 0"
								class="inline-flex items-center gap-1.5 text-sm"
							>
								<PriorityMark
									:priority="task.priority ?? 0"
									decorative
								/>
								{{ t(priorityLabelKey(task.priority ?? 0)) }}
							</span>
							<span
								v-else-if="column.key === 'labels'"
								class="inline-flex gap-2.5"
							>
								<span
									v-for="label in task.labels ?? []"
									:key="label.id"
									class="inline-flex items-center gap-1.5 text-sm text-ink-muted"
								>
									<UiColorDot :color="label.hex_color" />
									{{ label.title }}
								</span>
							</span>
							<span
								v-else-if="column.key === 'assignees'"
								class="inline-flex -space-x-1"
							>
								<UserAvatar
									v-for="user in task.assignees ?? []"
									:key="user.id"
									:username="user.username"
									:name="user.name"
									size="xs"
									class="ring-2 ring-canvas"
								/>
							</span>
							<TaskDue
								v-else-if="column.key === 'due_date' && getTaskDate(task.due_date)"
								:date="getTaskDate(task.due_date)!"
								:done="task.done"
							/>
							<span
								v-else-if="(column.key === 'start_date' || column.key === 'end_date') && getTaskDate(task[column.key])"
								class="font-mono text-2xs text-ink-muted"
							>{{ dates.dateTime(getTaskDate(task[column.key])!) }}</span>
							<span
								v-else-if="column.key === 'percent_done' && task.percent_done"
								class="inline-flex items-center gap-2"
							>
								<UiProgress
									:value="Math.round(task.percent_done * 100)"
									class="w-14"
								/>
								<span class="font-mono text-2xs text-ink-muted tabular-nums">{{ Math.round(task.percent_done * 100) }} %</span>
							</span>
							<span
								v-else-if="(column.key === 'done_at' || column.key === 'created' || column.key === 'updated') && getTaskDate(task[column.key])"
								class="font-mono text-2xs text-ink-muted"
								:title="task[column.key]"
							>{{ formatDateSince(task[column.key]) }}</span>
							<span
								v-else-if="column.key === 'created_by' && task.created_by"
								class="inline-flex items-center gap-1.5 text-sm text-ink-muted"
							>
								<UserAvatar
									:username="task.created_by.username"
									:name="task.created_by.name"
									size="xs"
								/>
								{{ getDisplayName(task.created_by) }}
							</span>
							<span
								v-else-if="column.key === 'comments' && task.comment_count"
								class="inline-flex items-center gap-1 font-mono text-2xs text-ink-faint"
							>
								<UiIcon
									:icon="MessageSquare"
									size="xs"
								/>{{ task.comment_count }}
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<nav
			v-if="list.totalPages.value > 1"
			:aria-label="t('projectView.table.pagination')"
			class="flex items-center justify-center gap-2 pt-4"
		>
			<UiButton
				variant="ghost"
				size="sm"
				:icon="ChevronLeft"
				:disabled="list.currentPage.value <= 1"
				@click="list.currentPage.value--"
			>
				{{ t('projectView.table.previous') }}
			</UiButton>
			<span class="font-mono text-2xs text-ink-faint tabular-nums">{{ list.currentPage.value }} / {{ list.totalPages.value }}</span>
			<UiButton
				variant="ghost"
				size="sm"
				:icon-end="ChevronRight"
				:disabled="list.currentPage.value >= list.totalPages.value"
				@click="list.currentPage.value++"
			>
				{{ t('projectView.table.next') }}
			</UiButton>
		</nav>
	</div>
</template>
