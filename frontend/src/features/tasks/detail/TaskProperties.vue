<script setup lang="ts">
import {computed, reactive, ref, watch, type Component, type Ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {
	AlarmClock,
	CalendarArrowDown,
	CalendarCheck2,
	CalendarClock,
	Flag,
	FolderClosed,
	Gauge,
	Palette,
	Plus,
	Repeat,
	Tag,
	Users,
} from '@lucide/vue'

import type {TaskReminder} from '@/client/generated'
import type {TaskDetail} from '@/client/queries/tasks'
import {useMoveTaskToProjectMutation} from '@/client/queries/tasks'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {toCssHex} from '@/helpers/color/toCssHex'
import {describeReminder, describeRepeat, type RepeatSettings, type Translate} from '@/modules/task/describe'
import {getTaskDate, type TaskDateField} from '@/modules/task/task'
import {getDisplayName} from '@/modules/user/displayName'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import type {UiMenuEntry} from '@/ui/menu'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiColorSwatches from '@/ui/UiColorSwatches.vue'
import UiMenu from '@/ui/UiMenu.vue'
import UiProgress from '@/ui/UiProgress.vue'

import PriorityMark from '../PriorityMark.vue'
import DatePicker from '../pickers/DatePicker.vue'
import ReminderEditor from '../pickers/ReminderEditor.vue'
import RepeatEditor from '../pickers/RepeatEditor.vue'
import {priorityLabelKey} from '../priority'
import AssigneePicker from '../properties/AssigneePicker.vue'
import LabelPicker from '../properties/LabelPicker.vue'
import PriorityPicker from '../properties/PriorityPicker.vue'
import ProgressPicker from '../properties/ProgressPicker.vue'
import ProjectPicker from '../properties/ProjectPicker.vue'
import PropertyRow from './PropertyRow.vue'

/**
 * The task's properties as rows. Only the ones with a value show; "Add property"
 * reveals another and opens its picker, and it hides again if left empty.
 */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const projects = useProjects()
const dates = useTaskDateFormat()
const actions = useTaskActionsStore()
const moveToProject = useMoveTaskToProjectMutation()

type PropertyKey =
	| 'priority'
	| 'dueDate'
	| 'startDate'
	| 'endDate'
	| 'reminders'
	| 'repeat'
	| 'labels'
	| 'assignees'
	| 'progress'
	| 'color'

const open = reactive<Record<PropertyKey | 'project', boolean>>({
	project: false,
	priority: false,
	dueDate: false,
	startDate: false,
	endDate: false,
	reminders: false,
	repeat: false,
	labels: false,
	assignees: false,
	progress: false,
	color: false,
})
const revealed = ref(new Set<PropertyKey>())

const project = computed(() => projects.projects[props.task.project_id ?? 0])
const color = computed(() => toCssHex(props.task.hex_color) ?? '')
const reminders = computed(() => props.task.reminders ?? [])
const repeats = computed(() => (props.task.repeat_after ?? 0) > 0 || props.task.repeat_mode === 1)

const DATE_ROWS: {key: PropertyKey, field: TaskDateField, icon: Component, label: string}[] = [
	{key: 'dueDate', field: 'due_date', icon: CalendarClock, label: 'taskDetail.properties.dueDate'},
	{key: 'startDate', field: 'start_date', icon: CalendarArrowDown, label: 'taskDetail.properties.startDate'},
	{key: 'endDate', field: 'end_date', icon: CalendarCheck2, label: 'taskDetail.properties.endDate'},
]

const hasValue = computed<Record<PropertyKey, boolean>>(() => ({
	priority: (props.task.priority ?? 0) > 0,
	dueDate: getTaskDate(props.task.due_date) !== null,
	startDate: getTaskDate(props.task.start_date) !== null,
	endDate: getTaskDate(props.task.end_date) !== null,
	reminders: reminders.value.length > 0,
	repeat: repeats.value,
	labels: (props.task.labels?.length ?? 0) > 0,
	assignees: (props.task.assignees?.length ?? 0) > 0,
	progress: (props.task.percent_done ?? 0) > 0,
	color: color.value !== '',
}))

const shown = (key: PropertyKey) => hasValue.value[key] || revealed.value.has(key)

// A revealed property that was left empty goes away once its picker closes.
watch(() => ({...open}), current => {
	for (const key of revealed.value) {
		if (!current[key] && !hasValue.value[key]) {
			revealed.value.delete(key)
		}
	}
})

const PROPERTIES: {key: PropertyKey, icon: Component, label: string}[] = [
	{key: 'priority', icon: Flag, label: 'taskDetail.properties.priority'},
	...DATE_ROWS.map(({key, icon, label}) => ({key, icon, label})),
	{key: 'reminders', icon: AlarmClock, label: 'taskDetail.properties.reminders'},
	{key: 'repeat', icon: Repeat, label: 'taskDetail.properties.repeat'},
	{key: 'labels', icon: Tag, label: 'taskDetail.properties.labels'},
	{key: 'assignees', icon: Users, label: 'taskDetail.properties.assignees'},
	{key: 'progress', icon: Gauge, label: 'taskDetail.properties.progress'},
	{key: 'color', icon: Palette, label: 'taskDetail.properties.color'},
]

const addable = computed<UiMenuEntry[]>(() => PROPERTIES
	.filter(property => !shown(property.key))
	.map(property => ({
		label: t(property.label),
		icon: property.icon,
		onSelect: () => openProperty(property.key),
	})))

/** Shows a property (even without a value) and opens its picker. Also used by keyboard shortcuts. */
function openProperty(key: PropertyKey | 'project') {
	if (key !== 'project') {
		revealed.value.add(key)
	}
	// After whatever had the focus (a menu, a shortcut) has let go of it, or the picker closes at once.
	setTimeout(() => open[key] = true, 0)
}

/**
 * Schedule pickers edit a draft taken when they open and save it when they close,
 * so picking a day and tapping outside keeps the day, as in a document.
 */
function draftWhileOpen<T>(key: PropertyKey, draft: Ref<T>, read: () => T, save: (value: T) => void) {
	watch(() => open[key], isOpen => {
		if (isOpen) {
			draft.value = read()
		} else if (JSON.stringify(draft.value) !== JSON.stringify(read())) {
			save(draft.value)
		}
	})
}

const dateDrafts: Record<TaskDateField, Ref<Date | null>> = {
	due_date: ref(null),
	start_date: ref(null),
	end_date: ref(null),
}
for (const {key, field} of DATE_ROWS) {
	draftWhileOpen(key, dateDrafts[field], () => getTaskDate(props.task[field]), date => {
		void actions.update(props.task, {[field]: date})
	})
}

const reminderDraft = ref<TaskReminder[]>([])
draftWhileOpen('reminders', reminderDraft, () => [...reminders.value], value => {
	void actions.update(props.task, {reminders: value})
})

const repeatDraft = ref<RepeatSettings>({repeat_after: 0, repeat_mode: 0})
draftWhileOpen('repeat', repeatDraft, () => ({
	repeat_after: props.task.repeat_after ?? 0,
	repeat_mode: props.task.repeat_mode ?? 0,
}), value => {
	void actions.update(props.task, value)
})

const translate = t as Translate
const reminderSummary = computed(() => {
	const [first, ...rest] = reminders.value
	if (!first) {
		return ''
	}
	const text = describeReminder(first, props.task, translate, dates.now.value, dates.options.value)
	return rest.length ? `${text} +${rest.length}` : text
})

function dateTone(field: TaskDateField, date: Date) {
	if (field !== 'due_date' || props.task.done) {
		return 'text-ink'
	}
	const state = dates.state(date)
	return state === 'overdue' ? 'text-danger' : state === 'today' ? 'text-accent' : 'text-ink'
}

function moveTo(projectId: number) {
	open.project = false
	if (props.task.id !== undefined && projectId !== props.task.project_id) {
		moveToProject.mutate({id: props.task.id, projectId})
	}
}

function setPriority(priority: number) {
	open.priority = false
	void actions.update(props.task, {priority})
}

function setProgress(percentDone: number) {
	open.progress = false
	void actions.update(props.task, {percent_done: percentDone})
}

function setColor(hex: string) {
	open.color = false
	void actions.update(props.task, {hex_color: hex})
}

defineExpose({openProperty})
</script>

<template>
	<div class="grid py-1">
		<PropertyRow
			v-model:open="open.project"
			:icon="FolderClosed"
			:label="t('taskDetail.properties.project')"
			:editable="editable"
		>
			<template #value>
				<UiColorDot :color="project?.hex_color" />
				<span class="truncate">{{ project?.title ?? t('taskDetail.unknownProject') }}</span>
			</template>
			<template #picker>
				<ProjectPicker
					:model-value="task.project_id ?? 0"
					@select="moveTo"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('priority')"
			v-model:open="open.priority"
			:icon="Flag"
			:label="t('taskDetail.properties.priority')"
			:editable="editable"
		>
			<template #value>
				<PriorityMark
					:priority="task.priority ?? 0"
					decorative
				/>
				<span :class="(task.priority ?? 0) === 0 && 'text-ink-faint'">{{ t(priorityLabelKey(task.priority ?? 0)) }}</span>
			</template>
			<template #picker>
				<PriorityPicker
					:model-value="task.priority ?? 0"
					@select="setPriority"
				/>
			</template>
		</PropertyRow>

		<template
			v-for="row in DATE_ROWS"
			:key="row.key"
		>
			<PropertyRow
				v-if="shown(row.key)"
				v-model:open="open[row.key]"
				:icon="row.icon"
				:label="t(row.label)"
				:editable="editable"
				popover-class="w-80"
			>
				<template #value>
					<span
						v-if="getTaskDate(task[row.field])"
						:class="cn('font-mono text-sm tabular-nums', dateTone(row.field, getTaskDate(task[row.field])!))"
					>{{ dates.dateTime(getTaskDate(task[row.field])!) }}</span>
					<span
						v-else
						class="text-ink-faint"
					>{{ t('taskDetail.empty') }}</span>
				</template>
				<template #picker>
					<DatePicker
						v-model="dateDrafts[row.field].value"
						@select="open[row.key] = false"
					/>
				</template>
			</PropertyRow>
		</template>

		<PropertyRow
			v-if="shown('reminders')"
			v-model:open="open.reminders"
			:icon="AlarmClock"
			:label="t('taskDetail.properties.reminders')"
			:editable="editable"
			popover-class="w-80"
		>
			<template #value>
				<span :class="!reminders.length && 'text-ink-faint'">{{ reminderSummary || t('taskDetail.empty') }}</span>
			</template>
			<template #picker>
				<ReminderEditor
					v-model="reminderDraft"
					:due-date="task.due_date"
					:start-date="task.start_date"
					:end-date="task.end_date"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('repeat')"
			v-model:open="open.repeat"
			:icon="Repeat"
			:label="t('taskDetail.properties.repeat')"
			:editable="editable"
			popover-class="w-80"
		>
			<template #value>
				<span :class="!repeats && 'text-ink-faint'">{{ describeRepeat(task.repeat_after, task.repeat_mode, translate) }}</span>
			</template>
			<template #picker>
				<RepeatEditor
					v-model="repeatDraft"
					@select="open.repeat = false"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('labels')"
			v-model:open="open.labels"
			:icon="Tag"
			:label="t('taskDetail.properties.labels')"
			:editable="editable"
		>
			<template #value>
				<span
					v-for="label in task.labels ?? []"
					:key="label.id"
					class="inline-flex h-6 items-center gap-1.5 rounded-sm border border-line bg-surface px-2 text-sm"
				>
					<UiColorDot :color="label.hex_color" />
					{{ label.title }}
				</span>
				<span
					v-if="!task.labels?.length"
					class="text-ink-faint"
				>{{ t('taskDetail.empty') }}</span>
			</template>
			<template #picker>
				<LabelPicker
					:task-id="task.id ?? 0"
					:selected="task.labels ?? []"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('assignees')"
			v-model:open="open.assignees"
			:icon="Users"
			:label="t('taskDetail.properties.assignees')"
			:editable="editable"
		>
			<template #value>
				<span
					v-for="user in task.assignees ?? []"
					:key="user.id"
					class="inline-flex items-center gap-1.5"
				>
					<UserAvatar
						:username="user.username"
						:name="user.name"
						size="xs"
					/>
					{{ getDisplayName(user) }}
				</span>
				<span
					v-if="!task.assignees?.length"
					class="text-ink-faint"
				>{{ t('taskDetail.empty') }}</span>
			</template>
			<template #picker>
				<AssigneePicker
					:task-id="task.id ?? 0"
					:project-id="task.project_id ?? 0"
					:selected="task.assignees ?? []"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('progress')"
			v-model:open="open.progress"
			:icon="Gauge"
			:label="t('taskDetail.properties.progress')"
			:editable="editable"
		>
			<template #value>
				<UiProgress
					:value="Math.round((task.percent_done ?? 0) * 100)"
					class="w-20"
				/>
				<span class="font-mono text-xs text-ink-muted tabular-nums">{{ Math.round((task.percent_done ?? 0) * 100) }} %</span>
			</template>
			<template #picker>
				<ProgressPicker
					:model-value="task.percent_done ?? 0"
					@select="setProgress"
				/>
			</template>
		</PropertyRow>

		<PropertyRow
			v-if="shown('color')"
			v-model:open="open.color"
			:icon="Palette"
			:label="t('taskDetail.properties.color')"
			:editable="editable"
		>
			<template #value>
				<UiColorDot
					:color="color"
					class="size-3"
				/>
				<span class="font-mono text-xs text-ink-muted">{{ color || t('taskDetail.empty') }}</span>
			</template>
			<template #picker>
				<div class="p-3">
					<UiColorSwatches
						:model-value="color"
						:label="t('taskDetail.properties.color')"
						@update:modelValue="setColor"
					/>
				</div>
			</template>
		</PropertyRow>

		<UiMenu
			v-if="editable && addable.length"
			:items="addable"
			:title="t('taskDetail.addProperty')"
			:restore-focus="false"
			align="start"
		>
			<template #trigger>
				<UiButton
					variant="ghost"
					size="sm"
					:icon="Plus"
					class="-ms-2.5 mt-1 justify-self-start text-ink-faint"
				>
					{{ t('taskDetail.addProperty') }}
				</UiButton>
			</template>
		</UiMenu>
	</div>
</template>
