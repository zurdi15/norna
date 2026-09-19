<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {ArrowUpRight, Trash2} from '@lucide/vue'

import type {Task, TimeEntry} from '@/client/generated'
import {isRunning, useCreateTimeEntryMutation, useUpdateTimeEntryMutation} from '@/client/queries/timeEntries'
import {useProjects} from '@/composables/useProjects'
import PickerField from '@/features/settings/account/PickerField.vue'
import {useTaskLink} from '@/features/tasks/useTaskLink'
import {addDays, isSameDay} from '@/helpers/time/dateMath'
import {parseTimeOfDay, timeOfDayOf, withTimeOfDay, type TimeOfDay} from '@/helpers/time/timeOfDay'
import {formatLongDate} from '@/modules/task/dueDate'
import {getTaskIdentifier} from '@/modules/task/task'
import {useAuthStore} from '@/stores/auth'
import UiButton from '@/ui/UiButton.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiInput from '@/ui/UiInput.vue'

import ClockInput from './ClockInput.vue'
import {formatDuration, parseDuration} from './duration'
import TaskPicker, {type TaskWithId} from './TaskPicker.vue'

/**
 * Logs time by hand, or edits an entry: the task, the day, start and end (or how long),
 * and a note. An end before the start runs past midnight. A running entry keeps running.
 */
const props = withDefaults(defineProps<{
	// Set to edit it; a new entry otherwise.
	entry?: TimeEntry | null
	// The entry's task, or the task new entries go on.
	task?: Task | null
	// The task can't be changed (on the task itself).
	lockTask?: boolean
	recentTasks?: readonly Task[]
	// Where a new entry starts: e.g. the end of the last one today.
	suggestedStart?: Date | null
}>(), {
	entry: null,
	task: null,
	lockTask: false,
	recentTasks: () => [],
	suggestedStart: null,
})

const emit = defineEmits<{
	delete: [entry: TimeEntry]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t, locale} = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const projects = useProjects()
const taskLink = useTaskLink()
const create = useCreateTimeEntryMutation()
const update = useUpdateTimeEntryMutation()
const formId = useId()

const pickedTask = ref<Task | null>(null)
// Entries logged straight on a project keep it until a task is picked.
const projectId = ref(0)
const startAt = ref(new Date())
const endAt = ref<Date | null>(null)
const comment = ref('')
const submitted = ref(false)

const editing = computed(() => props.entry !== null)
const running = computed(() => props.entry !== null && isRunning(props.entry))

const ONE_MINUTE = 60_000

// A new entry ends now and starts where the last one ended, at the user's usual start, or an hour earlier.
function newEntryStart(end: Date): Date {
	const usualStart = parseTimeOfDay(authStore.settings.frontend_settings.time_tracking_default_start)
	const candidates = [props.suggestedStart, usualStart ? withTimeOfDay(end, usualStart) : null]
	return candidates.find((start): start is Date => start instanceof Date && isSameDay(start, end) && start < end)
		?? new Date(end.getTime() - 60 * 60_000)
}

function reset() {
	submitted.value = false
	const entry = props.entry
	if (entry) {
		startAt.value = new Date(entry.start_time ?? Date.now())
		endAt.value = entry.end_time ? new Date(entry.end_time) : null
		comment.value = entry.comment ?? ''
		// A task that couldn't be loaded still keeps the entry on it.
		pickedTask.value = props.task ?? (entry.task_id ? {id: entry.task_id} : null)
		projectId.value = entry.task_id ? 0 : entry.project_id ?? 0
		return
	}
	const end = new Date(Math.floor(Date.now() / ONE_MINUTE) * ONE_MINUTE)
	startAt.value = newEntryStart(end)
	endAt.value = end
	comment.value = ''
	pickedTask.value = props.lockTask ? props.task : null
	projectId.value = 0
}

watch(open, isOpen => {
	if (isOpen) {
		reset()
	}
}, {immediate: true})

const durationMs = computed(() => endAt.value ? endAt.value.getTime() - startAt.value.getTime() : null)

// A new day keeps the times and the length.
const day = computed<Date | null>({
	get: () => startAt.value,
	set: picked => {
		if (!picked) {
			return
		}
		const length = durationMs.value
		startAt.value = withTimeOfDay(picked, timeOfDayOf(startAt.value))
		if (length !== null) {
			endAt.value = new Date(startAt.value.getTime() + length)
		}
	},
})

// Moving the start keeps the end, unless that would leave nothing: then the length moves along.
const startTime = computed<TimeOfDay | null>({
	get: () => timeOfDayOf(startAt.value),
	set: time => {
		if (!time) {
			return
		}
		const length = durationMs.value
		startAt.value = withTimeOfDay(startAt.value, time)
		if (endAt.value && length !== null && endAt.value <= startAt.value) {
			endAt.value = new Date(startAt.value.getTime() + length)
		}
	},
})

const endTime = computed<TimeOfDay | null>({
	get: () => endAt.value ? timeOfDayOf(endAt.value) : null,
	set: time => {
		if (!time) {
			return
		}
		let end = withTimeOfDay(startAt.value, time)
		if (end <= startAt.value) {
			end = addDays(end, 1)
		}
		endAt.value = end
	},
})
const endsNextDay = computed(() => endAt.value !== null && !isSameDay(endAt.value, startAt.value))

// Typed like the times: it only becomes the length on Enter or blur.
const durationDraft = ref('')
const editingDuration = ref(false)
watch(durationMs, length => {
	if (!editingDuration.value) {
		durationDraft.value = length !== null ? formatDuration(length / 1000) : ''
	}
}, {immediate: true})

function commitDuration() {
	editingDuration.value = false
	const minutes = parseDuration(durationDraft.value)
	if (minutes !== null) {
		endAt.value = new Date(startAt.value.getTime() + minutes * 60_000)
	}
	durationDraft.value = durationMs.value !== null ? formatDuration(durationMs.value / 1000) : ''
}

const project = computed(() => projects.projects[pickedTask.value?.project_id ?? projectId.value])
const taskText = computed(() => {
	if (pickedTask.value) {
		return pickedTask.value.title
			? `${getTaskIdentifier(pickedTask.value)} ${pickedTask.value.title}`.trim()
			: `#${pickedTask.value.id}`
	}
	return projectId.value ? t('timeTracking.form.onProject', {project: project.value?.title ?? `#${projectId.value}`}) : ''
})
const dayText = computed(() => formatLongDate(startAt.value, new Date(), {locale: locale.value}))

const taskError = computed(() => submitted.value && !pickedTask.value && !projectId.value ? t('timeTracking.form.taskRequired') : undefined)
const durationError = computed(() => submitted.value && !running.value && (durationMs.value ?? 0) <= 0 ? t('timeTracking.form.durationInvalid') : undefined)

function pickTask(picked: TaskWithId) {
	pickedTask.value = picked
	projectId.value = 0
}

function openTask() {
	if (pickedTask.value?.id !== undefined) {
		open.value = false
		void router.push(taskLink(pickedTask.value.id))
	}
}

const saving = computed(() => create.isPending.value || update.isPending.value)

async function submit() {
	submitted.value = true
	if (taskError.value || durationError.value) {
		return
	}
	const target = pickedTask.value?.id ? {task_id: pickedTask.value.id, project_id: 0} : {task_id: 0, project_id: projectId.value}
	const times = {
		start_time: startAt.value.toISOString(),
		end_time: running.value || !endAt.value ? null : endAt.value.toISOString(),
	}
	try {
		if (props.entry?.id !== undefined) {
			await update.mutateAsync({id: props.entry.id, entry: {...target, ...times, comment: comment.value.trim()}})
		} else {
			await create.mutateAsync({
				...(target.task_id ? {task_id: target.task_id} : {project_id: target.project_id}),
				...times,
				comment: comment.value.trim(),
			})
		}
		open.value = false
	} catch {
		// Reported by the mutation; the form stays for another try.
	}
}

function remove() {
	if (props.entry) {
		open.value = false
		emit('delete', props.entry)
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="editing ? t('timeTracking.editEntry') : t('timeTracking.logTime')"
	>
		<form
			:id="formId"
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiField
				v-if="!lockTask"
				v-slot="{id}"
				:label="t('timeTracking.form.task')"
				:error="taskError"
			>
				<div class="flex items-center gap-1">
					<div class="min-w-0 flex-1">
						<PickerField
							:id="id"
							v-slot="{close}"
							:title="t('timeTracking.form.task')"
							:text="taskText"
							:placeholder="t('timeTracking.form.pickTask')"
						>
							<TaskPicker
								:recent="recentTasks"
								:selected-id="pickedTask?.id"
								@select="picked => {pickTask(picked); close()}"
							/>
						</PickerField>
					</div>
					<UiIconButton
						v-if="pickedTask?.id"
						:icon="ArrowUpRight"
						:label="t('timeTracking.form.openTask')"
						@click="openTask"
					/>
				</div>
			</UiField>

			<UiField
				v-slot="{id}"
				:label="t('timeTracking.form.day')"
			>
				<PickerField
					:id="id"
					v-slot="{close}"
					:title="t('timeTracking.form.day')"
					:text="dayText"
				>
					<div class="p-3 pointer-coarse:px-4">
						<UiCalendar
							:model-value="day"
							:week-starts-on="authStore.settings.week_start"
							@update:modelValue="picked => {day = picked; close()}"
						/>
					</div>
				</PickerField>
			</UiField>

			<div class="grid grid-cols-3 gap-3">
				<UiField
					:label="t('timeTracking.form.start')"
					class="grid-cols-1"
				>
					<ClockInput v-model="startTime" />
				</UiField>
				<UiField
					v-if="!running"
					:label="t('timeTracking.form.end')"
					class="grid-cols-1"
					:hint="endsNextDay ? t('timeTracking.form.nextDay') : undefined"
				>
					<ClockInput v-model="endTime" />
				</UiField>
				<UiField
					v-if="!running"
					:label="t('timeTracking.form.duration')"
					class="grid-cols-1"
					:error="durationError"
				>
					<UiInput
						v-model="durationDraft"
						type="text"
						inputmode="text"
						autocomplete="off"
						spellcheck="false"
						:placeholder="t('timeTracking.form.durationPlaceholder')"
						class="font-mono tabular-nums"
						@focus="editingDuration = true"
						@blur="commitDuration"
						@keydown.enter="commitDuration"
					/>
				</UiField>
				<p
					v-else
					class="col-span-2 self-end pb-2 text-sm text-ink-muted"
				>
					{{ t('timeTracking.form.stillRunning') }}
				</p>
			</div>

			<UiField :label="t('timeTracking.form.note')">
				<UiInput
					v-model="comment"
					type="text"
					maxlength="250"
					:placeholder="t('timeTracking.form.commentPlaceholder')"
				/>
			</UiField>
		</form>

		<template #footer="{close}">
			<UiButton
				v-if="editing"
				variant="ghost"
				:icon="Trash2"
				class="me-auto text-danger hover:text-danger"
				@click="remove"
			>
				{{ t('timeTracking.delete') }}
			</UiButton>
			<UiButton
				variant="ghost"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				:form="formId"
				variant="primary"
				:loading="saving"
			>
				{{ editing ? t('timeTracking.form.update') : t('timeTracking.form.save') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
