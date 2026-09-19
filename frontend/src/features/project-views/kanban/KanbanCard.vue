<script setup lang="ts">
import {computed, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {Columns3, Ellipsis, ListChecks, ListTree, MessageSquare, Paperclip, Repeat} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {useProjects} from '@/composables/useProjects'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {useAttachmentUrl} from '@/features/tasks/attachments/useAttachmentUrl'
import PriorityMark from '@/features/tasks/PriorityMark.vue'
import TaskCheck from '@/features/tasks/TaskCheck.vue'
import TaskDue from '@/features/tasks/TaskDue.vue'
import TaskTypeChips from '@/features/tasks/TaskTypeChips.vue'
import {splitTaskTypes, useTaskTypeIds} from '@/features/tasks/taskTypes'
import {useTaskLink} from '@/features/tasks/useTaskLink'
import {useTaskMenu} from '@/features/tasks/useTaskMenu'
import {getChecklistStatistics} from '@/helpers/checklistFromText'
import {attachmentKind} from '@/modules/task/attachmentKind'
import {getTaskDate, getTaskIdentifier} from '@/modules/task/task'
import {useAuthStore} from '@/stores/auth'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiContextMenu from '@/ui/UiContextMenu.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import type {UiMenuEntry} from '@/ui/menu'
import UiMenu from '@/ui/UiMenu.vue'

import {withMoveEntry} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** One task on the board. The column around it owns dragging; the card owns what a task shows and does. */
const props = defineProps<{
	task: Task
	bucketId: number
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const board = useKanbanBoard()
const projects = useProjects()
const actions = useTaskActionsStore()
const authStore = useAuthStore()
const taskLink = useTaskLink()
const taskMenu = useTaskMenu()
const {hasFinePointer} = useBreakpoints()

const done = computed(() => props.task.done ?? false)
const identifier = computed(() => getTaskIdentifier(props.task))
const due = computed(() => getTaskDate(props.task.due_date))
const typeIds = useTaskTypeIds()
const labelsByKind = computed(() => splitTaskTypes(props.task.labels ?? [], typeIds.value))
const types = computed(() => labelsByKind.value.types)
const labels = computed(() => labelsByKind.value.others)
const shownLabels = computed(() => labels.value.slice(0, 4))
const assignees = computed(() => props.task.assignees ?? [])
const checklist = computed(() => props.task.description ? getChecklistStatistics(props.task.description) : {total: 0, checked: 0})
const subtasks = computed(() => props.task.related_tasks?.subtask ?? [])
const subtasksDone = computed(() => subtasks.value.filter(task => task.done).length)
const attachments = computed(() => props.task.attachments?.length ?? 0)
const comments = computed(() => props.task.comment_count ?? 0)
const repeats = computed(() => (props.task.repeat_after ?? 0) > 0 || props.task.repeat_mode === 1)
// Saved filter boards mix projects; a card from another project says which one.
const otherProject = computed(() => props.task.project_id !== board.projectId.value
	? projects.projects[props.task.project_id ?? 0]
	: undefined)
const shownPriority = computed(() => (props.task.priority ?? 0) >= authStore.settings.frontend_settings.minimum_priority
	? props.task.priority ?? 0
	: 0)

const hasMeta = computed(() => due.value !== null || repeats.value || otherProject.value !== undefined
	|| labels.value.length > 0 || assignees.value.length > 0 || checklist.value.total > 0
	|| subtasks.value.length > 0 || attachments.value > 0 || comments.value > 0)

const cover = computed(() => {
	const id = props.task.cover_image_attachment_id
	const attachment = id ? props.task.attachments?.find(candidate => candidate.id === id) : undefined
	return attachment && attachmentKind(attachment) === 'image' ? attachment : undefined
})
const {url: coverUrl} = useAttachmentUrl(cover, 'md')

const menuItems = computed<UiMenuEntry[]>(() => {
	const entries = taskMenu(props.task, {readOnly: !board.canWrite.value})
	if (!board.canWrite.value || !board.canMoveBetween.value || board.buckets.value.length < 2) {
		return entries
	}
	return withMoveEntry(entries, {
		label: t('kanban.moveTo'),
		icon: Columns3,
		onSelect: () => board.openMoveTo(props.task, props.bucketId),
	})
})

const contextMenu = useTemplateRef<InstanceType<typeof UiContextMenu>>('contextMenu')

function setDone(value: boolean) {
	actions.setDone(props.task, value)
}

// The click that ends a drag lands on the card's link.
function onClickCapture(event: MouseEvent) {
	if (board.isClickSuppressed()) {
		event.preventDefault()
		event.stopPropagation()
	}
}

defineExpose({
	openMenu: () => contextMenu.value?.open(),
})

const countClass = 'inline-flex items-center gap-1 font-mono text-2xs text-ink-faint tabular-nums'
</script>

<template>
	<!-- On touch screens with dragging on, the column turns a long press into this menu. -->
	<UiContextMenu
		ref="contextMenu"
		:items="menuItems"
		:title="task.title ?? ''"
		:disabled="!hasFinePointer && board.canWrite.value"
	>
		<article
			:data-done="done || undefined"
			:class="cn(
				'group/card relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-line bg-surface',
				'px-3 pt-2.5 pb-3 transition-[border-color,box-shadow] duration-150 select-none touch-callout-none',
				'hover:border-line-strong',
				'in-[.kanban-lift]:border-accent-line in-[.kanban-lift]:shadow-overlay',
				'pointer-coarse:in-[.kanban-chosen]:border-accent-line pointer-coarse:in-[.kanban-chosen]:shadow-overlay',
			)"
			@click.capture="onClickCapture"
		>
			<img
				v-if="coverUrl"
				:src="coverUrl"
				alt=""
				draggable="false"
				class="-mx-3 -mt-2.5 mb-1 aspect-video max-h-36 w-[calc(100%+1.5rem)] max-w-none bg-canvas-subtle object-cover"
			>

			<div class="flex min-h-4 items-center gap-2">
				<span class="truncate font-mono text-2xs tracking-wide text-ink-faint">{{ identifier }}</span>
				<TaskTypeChips :types="types" />
				<span
					v-if="task.is_unread"
					class="size-1.5 shrink-0 rounded-full bg-accent"
					:title="t('tasks.row.unread')"
				>
					<span class="sr-only">{{ t('tasks.row.unread') }}</span>
				</span>
				<PriorityMark
					:priority="shownPriority"
					class="ms-auto"
				/>
			</div>

			<div class="flex items-start gap-2.5">
				<TaskCheck
					v-if="board.canWrite.value"
					:model-value="done"
					:priority="task.priority"
					:label="t(done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: task.title})"
					class="z-10 mt-px"
					@update:modelValue="setDone"
				/>
				<!-- The link covers the whole card; the check and the menu sit above it. -->
				<RouterLink
					:to="taskLink(task.id ?? 0)"
					draggable="false"
					:class="cn(
						'min-w-0 flex-1 text-md/snug text-pretty wrap-break-word pointer-fine:text-base/snug',
						'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none',
						'focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-inset',
						done && 'text-ink-faint line-through decoration-line-strong',
					)"
				>
					{{ task.title }}
				</RouterLink>
			</div>

			<div
				v-if="hasMeta"
				class="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted"
			>
				<TaskDue
					v-if="due"
					:date="due"
					:done="done"
				/>
				<UiIcon
					v-if="repeats"
					:icon="Repeat"
					:label="t('tasks.row.repeats')"
					size="xs"
					class="text-ink-faint"
				/>
				<span
					v-if="otherProject"
					class="inline-flex max-w-36 items-center gap-1.5 whitespace-nowrap"
				>
					<UiColorDot :color="otherProject.hex_color" />
					<span class="truncate">{{ otherProject.title }}</span>
				</span>
				<span
					v-for="label in shownLabels"
					:key="label.id"
					class="inline-flex max-w-32 items-center gap-1.5 whitespace-nowrap"
				>
					<UiColorDot :color="label.hex_color" />
					<span class="truncate">{{ label.title }}</span>
				</span>
				<span
					v-if="labels.length > shownLabels.length"
					:class="countClass"
				>+{{ labels.length - shownLabels.length }}</span>
				<span
					v-if="subtasks.length"
					:class="countClass"
					:title="t('tasks.row.subtasks', {done: subtasksDone, total: subtasks.length})"
				>
					<UiIcon
						:icon="ListTree"
						size="xs"
					/>{{ subtasksDone }}/{{ subtasks.length }}
				</span>
				<span
					v-if="checklist.total"
					:class="countClass"
					:title="t('tasks.row.checklist', {done: checklist.checked, total: checklist.total})"
				>
					<UiIcon
						:icon="ListChecks"
						size="xs"
					/>{{ checklist.checked }}/{{ checklist.total }}
				</span>
				<span
					v-if="comments"
					:class="countClass"
					:title="t('tasks.row.comments', comments)"
				>
					<UiIcon
						:icon="MessageSquare"
						size="xs"
					/>{{ comments }}
				</span>
				<span
					v-if="attachments"
					:class="countClass"
					:title="t('tasks.row.attachments', attachments)"
				>
					<UiIcon
						:icon="Paperclip"
						size="xs"
					/>{{ attachments }}
				</span>
				<span
					v-if="assignees.length"
					class="ms-auto inline-flex -space-x-1"
				>
					<UserAvatar
						v-for="user in assignees.slice(0, 3)"
						:key="user.id"
						:username="user.username"
						:name="user.name"
						size="xs"
						class="ring-2 ring-surface"
					/>
				</span>
			</div>

			<!-- Pointer screens get the menu on hover too, not only on right click. -->
			<UiMenu
				v-if="hasFinePointer"
				:items="menuItems"
				:title="task.title ?? ''"
			>
				<template #trigger>
					<UiIconButton
						:icon="Ellipsis"
						:label="t('tasks.row.actions')"
						size="sm"
						class="
							absolute inset-e-1 top-1 z-10 size-6 bg-surface opacity-0
							group-hover/card:opacity-100
							focus-visible:opacity-100
							in-[.kanban-lift]:invisible
							data-[state=open]:opacity-100
						"
					/>
				</template>
			</UiMenu>
		</article>
	</UiContextMenu>
</template>
