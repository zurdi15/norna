<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {Play, Square} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {taskQuery} from '@/client/queries/tasks'
import {useCreateTimeEntryMutation, useStopTimerMutation} from '@/client/queries/timeEntries'
import {useActiveTimer} from '@/composables/useActiveTimer'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {useTaskLink} from '@/features/tasks/useTaskLink'
import {isSameDay} from '@/helpers/time/dateMath'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import {entrySeconds, formatElapsed} from './duration'
import TaskPicker, {type TaskWithId} from './TaskPicker.vue'
import {useSecondTicker} from './useSecondTicker'

/** The running timer with its clock and a stop button; without one, a way to start it on a task. */
withDefaults(defineProps<{
	// Offered first when picking a task.
	recentTasks?: readonly Task[]
}>(), {
	recentTasks: () => [],
})

const {t} = useI18n()
const dates = useTaskDateFormat()
const projects = useProjects()
const taskLink = useTaskLink()
const {activeTimer, isPending} = useActiveTimer()
const stop = useStopTimerMutation()
const create = useCreateTimeEntryMutation()

const now = useSecondTicker(() => activeTimer.value !== null)
const timerTask = useQuery(computed(() => taskQuery(activeTimer.value?.task_id ?? 0)))
const task = computed(() => activeTimer.value?.task_id ? timerTask.data.value : undefined)
const project = computed(() => projects.projects[task.value?.project_id ?? activeTimer.value?.project_id ?? 0])

const startedAt = computed(() => new Date(activeTimer.value?.start_time ?? 0))
// Today's timers show the time; older ones the day as well.
const since = computed(() => isSameDay(startedAt.value, now.value)
	? t('timeTracking.timer.runningSince', {time: dates.time(startedAt.value)})
	: t('timeTracking.timer.runningSinceDay', {time: dates.dateTime(startedAt.value)}))
const elapsed = computed(() => activeTimer.value ? formatElapsed(entrySeconds(activeTimer.value, now.value)) : '')

const pickerOpen = ref(false)

function start(picked: TaskWithId) {
	pickerOpen.value = false
	create.mutate({task_id: picked.id, start_time: new Date().toISOString()})
}
</script>

<template>
	<section
		:aria-label="t('timeTracking.timer.label')"
		class="@container rounded-lg border border-line bg-surface"
	>
		<div
			v-if="isPending"
			class="grid gap-2 p-4"
			aria-hidden="true"
		>
			<UiSkeleton class="h-3 w-24" />
			<UiSkeleton class="h-6 w-1/2" />
		</div>

		<div
			v-else-if="activeTimer"
			class="grid gap-3 p-4 @lg:flex @lg:items-center @lg:gap-6"
		>
			<div class="min-w-0 flex-1">
				<p class="flex items-center gap-1.5 caption">
					<span
						class="size-1.5 animate-pulse rounded-full bg-accent"
						aria-hidden="true"
					/>
					{{ since }}
				</p>
				<RouterLink
					v-if="task?.id"
					:to="taskLink(task.id)"
					class="mt-1 block truncate text-md font-medium hover:underline"
				>
					{{ task.title }}
				</RouterLink>
				<p
					v-else
					class="mt-1 truncate text-md font-medium"
				>
					{{ project?.title ?? '' }}
				</p>
				<p
					v-if="project && task"
					class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint"
				>
					<UiColorDot :color="project.hex_color" />
					<span class="truncate">{{ project.title }}</span>
				</p>
			</div>
			<div class="flex items-center justify-between gap-4">
				<span
					role="timer"
					class="font-mono text-3xl font-medium tracking-tight tabular-nums"
				>{{ elapsed }}</span>
				<UiButton
					variant="primary"
					:icon="Square"
					:loading="stop.isPending.value"
					@click="stop.mutate()"
				>
					{{ t('timeTracking.stop') }}
				</UiButton>
			</div>
		</div>

		<div
			v-else
			class="grid gap-3 p-4 @lg:flex @lg:items-center @lg:gap-4"
		>
			<div class="min-w-0 flex-1">
				<p class="caption">
					{{ t('timeTracking.timer.idle') }}
				</p>
				<p class="mt-1 text-sm text-pretty text-ink-muted">
					{{ t('timeTracking.timer.idleHint') }}
				</p>
			</div>
			<UiAdaptivePopover
				v-model:open="pickerOpen"
				:title="t('timeTracking.timer.pickTask')"
				align="end"
			>
				<template #trigger>
					<UiButton
						variant="primary"
						:icon="Play"
						:loading="create.isPending.value"
						class="w-full @lg:w-auto"
					>
						{{ t('timeTracking.form.startTimer') }}
					</UiButton>
				</template>
				<TaskPicker
					:recent="recentTasks"
					@select="start"
				/>
			</UiAdaptivePopover>
		</div>
	</section>
</template>
