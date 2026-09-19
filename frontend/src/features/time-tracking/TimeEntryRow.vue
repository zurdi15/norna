<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Trash2} from '@lucide/vue'

import type {Task, TimeEntry} from '@/client/generated'
import {isRunning} from '@/client/queries/timeEntries'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {startOfDay} from '@/helpers/time/dateMath'
import {getTaskIdentifier} from '@/modules/task/task'
import {cn} from '@/ui/cn'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import {entrySeconds, formatDuration} from './duration'

/**
 * One time entry. On the time tracking page it names the task and its project (a denser,
 * table-like row in wide containers); on a task it reads as the day, the times and the note.
 * The user's own entries open for editing.
 */
const props = withDefaults(defineProps<{
	entry: TimeEntry
	task?: Task
	// Off on a task's own list, where the task goes without saying.
	showTask?: boolean
	editable?: boolean
	now: Date
}>(), {
	task: undefined,
	showTask: true,
	editable: false,
})

const emit = defineEmits<{
	edit: []
	delete: []
}>()

const {t} = useI18n()
const dates = useTaskDateFormat()
const projects = useProjects()

const start = computed(() => new Date(props.entry.start_time ?? 0))
const running = computed(() => isRunning(props.entry))
const timeRange = computed(() => `${dates.time(start.value)} – ${props.entry.end_time ? dates.time(new Date(props.entry.end_time)) : '…'}`)
const duration = computed(() => formatDuration(entrySeconds(props.entry, props.now)))

// Entries sit on a task or straight on a project.
const project = computed(() => projects.projects[props.task?.project_id ?? props.entry.project_id ?? 0])
const title = computed(() => {
	if (props.task) {
		return props.task.title ?? ''
	}
	if (props.entry.task_id) {
		return `#${props.entry.task_id}`
	}
	return project.value?.title ?? ''
})
const comment = computed(() => props.entry.comment?.trim() ?? '')
</script>

<template>
	<div
		:class="cn(
			'group/entry relative flex items-center gap-3',
			showTask
				? 'min-h-12 px-4 py-1.5 @2xl:px-6 pointer-coarse:min-h-14'
				: '-mx-2 min-h-9 rounded-md px-2 pointer-coarse:min-h-11',
			editable && 'hover:bg-canvas-subtle',
		)"
		data-time-entry
	>
		<!-- Wide containers: the times get their own column. -->
		<span
			v-if="showTask"
			class="hidden w-28 shrink-0 font-mono text-xs text-ink-muted tabular-nums @2xl:block"
		>{{ timeRange }}</span>

		<div
			v-if="showTask"
			class="min-w-0 flex-1"
		>
			<p class="flex min-w-0 items-baseline gap-2">
				<span
					v-if="task"
					class="hidden shrink-0 font-mono text-2xs text-ink-faint @2xl:inline"
				>{{ getTaskIdentifier(task) }}</span>
				<component
					:is="editable ? 'button' : 'span'"
					:type="editable ? 'button' : undefined"
					:class="cn(
						'min-w-0 truncate text-start text-base pointer-coarse:text-md',
						!task && entry.task_id === 0 && 'text-ink-muted',
						editable && `
							cursor-pointer
							after:absolute after:inset-0
							focus-visible:outline-none
							focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-inset
						`,
					)"
					@click="editable && emit('edit')"
				>
					{{ title }}
				</component>
				<span
					v-if="project && (task || entry.task_id)"
					class="hidden min-w-0 shrink items-center gap-1.5 truncate text-xs text-ink-faint @2xl:inline-flex"
				>
					<UiColorDot :color="project.hex_color" />
					<span class="truncate">{{ project.title }}</span>
				</span>
			</p>
			<p class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint @2xl:hidden">
				<span class="shrink-0 font-mono tabular-nums">{{ timeRange }}</span>
				<template v-if="project && (task || entry.task_id)">
					<span aria-hidden="true">·</span>
					<span class="truncate">{{ project.title }}</span>
				</template>
				<template v-if="comment">
					<span aria-hidden="true">·</span>
					<span class="min-w-0 truncate">{{ comment }}</span>
				</template>
			</p>
		</div>
		<span
			v-if="showTask"
			class="hidden w-56 shrink-0 truncate text-sm text-ink-muted @2xl:block"
		>{{ comment }}</span>

		<!-- On a task: the day, the times and the note on one line. -->
		<component
			:is="editable ? 'button' : 'div'"
			v-else
			:type="editable ? 'button' : undefined"
			:class="cn(
				'flex min-w-0 flex-1 items-baseline gap-2 text-start',
				editable && `
					cursor-pointer
					after:absolute after:inset-0
					focus-visible:outline-none
					focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-accent
				`,
			)"
			@click="editable && emit('edit')"
		>
			<span class="shrink-0 text-base pointer-coarse:text-md">{{ dates.short(startOfDay(start)) }}</span>
			<span class="shrink-0 font-mono text-xs text-ink-faint tabular-nums">{{ timeRange }}</span>
			<span
				v-if="comment"
				class="min-w-0 truncate text-sm text-ink-muted"
			>{{ comment }}</span>
		</component>

		<span
			:class="cn(
				'flex shrink-0 items-center gap-1.5 font-mono text-sm tabular-nums',
				running ? 'text-accent' : 'text-ink',
			)"
		>
			<span
				v-if="running"
				class="size-1.5 animate-pulse rounded-full bg-accent"
				:title="t('timeTracking.running')"
			/>
			{{ duration }}
		</span>
		<UiIconButton
			v-if="editable"
			:icon="Trash2"
			:label="t('timeTracking.deleteEntry')"
			size="sm"
			class="
				relative z-10 -me-2 text-ink-faint opacity-0
				group-hover/entry:opacity-100
				hover:text-danger
				focus-visible:opacity-100
				pointer-coarse:hidden
			"
			@click="emit('delete')"
		/>
	</div>
</template>
