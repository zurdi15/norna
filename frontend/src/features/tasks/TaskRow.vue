<script setup lang="ts">
import {computed, useTemplateRef, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {
	Check,
	CheckSquare,
	Ellipsis,
	ListChecks,
	ListTree,
	MessageSquare,
	Paperclip,
	Repeat,
	RotateCcw,
} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {useProjects} from '@/composables/useProjects'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {getChecklistStatistics} from '@/helpers/checklistFromText'
import {getTaskDate, getTaskIdentifier} from '@/modules/task/task'
import {useAuthStore} from '@/stores/auth'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import {useSwipeAction} from '@/ui/composables/useSwipeAction'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiContextMenu from '@/ui/UiContextMenu.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import PriorityMark from './PriorityMark.vue'
import TaskCheck from './TaskCheck.vue'
import TaskDue from './TaskDue.vue'
import {useTaskSelection} from './selection'
import {useTaskLink} from './useTaskLink'
import {useTaskMenu} from './useTaskMenu'

/**
 * One task in a list. It sizes itself by its container, not the viewport: two lines
 * in a phone, a kanban column or next to the detail panel, one line in a wide list.
 */
const props = withDefaults(defineProps<{
	task: Task
	// Off inside a project, where every row would repeat its name.
	showProject?: boolean
	// Identifiers ("NOR-12") help inside one project; across projects "#1" repeats. Defaults to !showProject.
	showIdentifier?: boolean
	// The keyboard cursor of the list (j/k).
	active?: boolean
	// Tasks of a project shared read-only: they open, but don't change.
	readOnly?: boolean
	class?: HTMLAttributes['class']
}>(), {
	showProject: true,
	showIdentifier: undefined,
	active: false,
	readOnly: false,
	class: undefined,
})

const {t} = useI18n()
const projects = useProjects()
const actions = useTaskActionsStore()
const taskLink = useTaskLink()
const taskMenu = useTaskMenu()
const {hasFinePointer} = useBreakpoints()

const done = computed(() => props.task.done ?? false)
const due = computed(() => getTaskDate(props.task.due_date))
const identifier = computed(() => (props.showIdentifier ?? !props.showProject) ? getTaskIdentifier(props.task) : '')
const project = computed(() => props.showProject ? projects.projects[props.task.project_id ?? 0] : undefined)
const labels = computed(() => props.task.labels ?? [])
const assignees = computed(() => props.task.assignees ?? [])
const checklist = computed(() => props.task.description ? getChecklistStatistics(props.task.description) : {total: 0, checked: 0})
const subtasks = computed(() => props.task.related_tasks?.subtask ?? [])
const subtasksDone = computed(() => subtasks.value.filter(task => task.done).length)
const attachments = computed(() => props.task.attachments?.length ?? 0)
const comments = computed(() => props.task.comment_count ?? 0)
// Priorities under the user's threshold are noise in a list; the detail still shows them.
const authStore = useAuthStore()
const shownPriority = computed(() => (props.task.priority ?? 0) >= authStore.settings.frontend_settings.minimum_priority
	? props.task.priority ?? 0
	: 0)
const repeats = computed(() => (props.task.repeat_after ?? 0) > 0 || props.task.repeat_mode === 1)

const hasMeta = computed(() => due.value !== null || repeats.value || project.value !== undefined
	|| labels.value.length > 0 || assignees.value.length > 0 || checklist.value.total > 0
	|| subtasks.value.length > 0 || attachments.value > 0 || comments.value > 0)

// Pages that allow bulk actions provide a selection; once something is picked, a tap selects.
const selection = useTaskSelection()
const selected = computed(() => selection?.isSelected(props.task.id) ?? false)
const selecting = computed(() => selection?.active ?? false)

const menuItems = computed(() => selection && !props.readOnly
	? [
		{label: selected.value ? t('tasks.bulk.deselect') : t('tasks.bulk.select'), icon: CheckSquare, onSelect: () => selection.toggle(props.task)},
		{type: 'separator' as const},
		...taskMenu(props.task),
	]
	: taskMenu(props.task, {readOnly: props.readOnly}))

function onClickCapture(event: MouseEvent) {
	if (!selecting.value || !selection) {
		return
	}
	event.preventDefault()
	event.stopPropagation()
	selection.toggle(props.task)
}

const contextMenu = useTemplateRef<InstanceType<typeof UiContextMenu>>('contextMenu')
const root = useTemplateRef<HTMLElement>('root')
const swipe = useSwipeAction({
	target: root,
	// Read-only rows keep the long press for their menu; a swipe would promise a change.
	enabled: computed(() => !hasFinePointer.value && !selecting.value && !props.readOnly),
	onSwipeRight: () => actions.setDone(props.task, !done.value),
	onSwipeLeft: () => contextMenu.value?.open(),
})

function setDone(value: boolean) {
	actions.setDone(props.task, value)
}

const countClass = 'inline-flex items-center gap-1 font-mono text-2xs text-ink-faint tabular-nums'
</script>

<template>
	<UiContextMenu
		ref="contextMenu"
		:items="menuItems"
		:title="task.title ?? ''"
	>
		<div
			ref="root"
			:class="cn('@container relative touch-pan-y overflow-hidden select-none touch-callout-none', props.class)"
			@click.capture="onClickCapture"
		>
			<!-- What letting go will do, revealed under the row as it slides. -->
			<div
				v-if="swipe.direction.value"
				aria-hidden="true"
				:class="cn(
					'absolute inset-0 flex items-center px-6 transition-colors',
					swipe.direction.value === 'right'
						? ['justify-start', swipe.armed.value ? 'bg-success text-on-state' : 'bg-success-subtle text-success']
						: ['justify-end', swipe.armed.value ? 'bg-accent text-on-accent' : 'bg-accent-subtle text-accent'],
				)"
			>
				<UiIcon
					:icon="swipe.direction.value === 'left' ? Ellipsis : done ? RotateCcw : Check"
					:stroke="2.5"
					size="lg"
				/>
			</div>

			<div
				:data-active="active || undefined"
				:data-selected="selected || undefined"
				:style="swipe.style.value"
				:class="cn(
					'group/row relative flex gap-3 bg-canvas px-4 py-2.5 transition-colors duration-150',
					'hover:bg-canvas-subtle data-active:bg-canvas-subtle data-selected:bg-accent-subtle',
					'@xl:min-h-9.5 @xl:items-center @xl:px-6 @xl:py-1.5',
				)"
			>
				<TaskCheck
					:model-value="done"
					:priority="task.priority"
					:label="t(done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: task.title})"
					:disabled="readOnly"
					class="z-10 mt-0.5 @xl:mt-0"
					@update:modelValue="setDone"
				/>
				<span
					v-if="identifier"
					class="hidden w-16 shrink-0 truncate font-mono text-2xs text-ink-faint @xl:inline"
				>{{ identifier }}</span>

				<div class="flex min-w-0 flex-1 flex-col @xl:flex-row @xl:items-center @xl:gap-3">
					<div class="flex min-w-0 items-baseline gap-2 @xl:flex-1">
						<span
							v-if="task.is_unread"
							class="size-1.5 shrink-0 -translate-y-0.5 rounded-full bg-accent"
							:title="t('tasks.row.unread')"
						>
							<span class="sr-only">{{ t('tasks.row.unread') }}</span>
						</span>
						<!-- The link covers the whole row; the check and the menu sit above it. -->
						<RouterLink
							:to="taskLink(task.id ?? 0)"
							:class="cn(
								'min-w-0 text-md/snug text-pretty after:absolute after:inset-0 focus-visible:outline-none',
								'focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-inset',
								'@xl:truncate pointer-fine:text-base',
								done && 'text-ink-faint line-through decoration-line-strong',
							)"
						>
							{{ task.title }}
							<span
								v-if="selected"
								class="sr-only"
							>{{ t('tasks.bulk.isSelected') }}</span>
						</RouterLink>
					</div>

					<div
						v-if="hasMeta"
						class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-muted @xl:mt-0 @xl:flex-nowrap"
					>
						<TaskDue
							v-if="due"
							:date="due"
							:done="done"
							class="@xl:order-last @xl:min-w-20 @xl:justify-end"
						/>
						<UiIcon
							v-if="repeats"
							:icon="Repeat"
							:label="t('tasks.row.repeats')"
							size="xs"
							class="text-ink-faint"
						/>
						<span
							v-if="project"
							class="inline-flex max-w-40 items-center gap-1.5 whitespace-nowrap"
						>
							<UiColorDot :color="project.hex_color" />
							<span class="truncate">{{ project.title }}</span>
						</span>
						<span
							v-for="label in labels"
							:key="label.id"
							class="inline-flex max-w-32 items-center gap-1.5 whitespace-nowrap"
						>
							<UiColorDot :color="label.hex_color" />
							<span class="truncate">{{ label.title }}</span>
						</span>
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
							class="inline-flex -space-x-1"
						>
							<UserAvatar
								v-for="user in assignees.slice(0, 3)"
								:key="user.id"
								:username="user.username"
								:name="user.name"
								size="xs"
								class="ring-2 ring-canvas"
							/>
						</span>
					</div>
				</div>

				<PriorityMark
					:priority="shownPriority"
					class="mt-1 @xl:mt-0"
				/>

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
								absolute inset-e-2 top-1/2 z-10 -translate-y-1/2 bg-canvas-subtle opacity-0
								group-hover/row:opacity-100
								focus-visible:opacity-100
								data-[state=open]:opacity-100
							"
						/>
					</template>
				</UiMenu>
			</div>
		</div>
	</UiContextMenu>
</template>
