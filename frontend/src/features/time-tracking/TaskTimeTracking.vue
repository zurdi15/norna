<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {Play, Plus, Square} from '@lucide/vue'

import type {TimeEntry} from '@/client/generated'
import type {TaskDetail} from '@/client/queries/tasks'
import {taskTimeEntriesQuery, useCreateTimeEntryMutation, useStopTimerMutation} from '@/client/queries/timeEntries'
import {useActiveTimer, useTimerEvents} from '@/composables/useActiveTimer'
import {useGlobalNow} from '@/composables/useGlobalNow'
import DetailSection from '@/features/tasks/detail/DetailSection.vue'
import {useAuthStore} from '@/stores/auth'
import UiButton from '@/ui/UiButton.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import {entrySeconds, formatDuration, formatElapsed, totalSeconds} from './duration'
import TimeEntryDialog from './TimeEntryDialog.vue'
import TimeEntryRow from './TimeEntryRow.vue'
import {useDeleteTimeEntry} from './useDeleteTimeEntry'
import {useSecondTicker} from './useSecondTicker'

/**
 * Time on this task: start or stop the timer here, log time by hand, and every
 * entry on it with the total. Only the user's own entries can be changed.
 */
const props = defineProps<{
	task: TaskDetail
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()
const {now} = useGlobalNow()
const {activeTimer} = useActiveTimer()
const create = useCreateTimeEntryMutation()
const stop = useStopTimerMutation()
const deleteEntry = useDeleteTimeEntry()
useTimerEvents()

// Link shares can't track time.
const available = computed(() => authStore.authUser && props.task.id !== undefined)
const taskId = computed(() => props.task.id ?? 0)

const entriesQuery = useQuery(computed(() => ({
	...taskTimeEntriesQuery(taskId.value),
	enabled: available.value && taskId.value > 0,
})))
// Newest first.
const entries = computed(() => [...entriesQuery.data.value ?? []]
	.sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime()))
const total = computed(() => totalSeconds(entries.value, now.value))

const runningHere = computed(() => activeTimer.value?.task_id === taskId.value)
const tick = useSecondTicker(runningHere)
const elapsed = computed(() => runningHere.value && activeTimer.value ? formatElapsed(entrySeconds(activeTimer.value, tick.value)) : '')

function startTimer() {
	create.mutate({task_id: taskId.value, start_time: new Date().toISOString()})
}

const dialogOpen = ref(false)
const editing = ref<TimeEntry | null>(null)

function logTime() {
	editing.value = null
	dialogOpen.value = true
}

function edit(entry: TimeEntry) {
	editing.value = entry
	dialogOpen.value = true
}

// Continues from the last entry on this task when it ended today.
const suggestedStart = computed(() => {
	const last = entries.value.find(entry => entry.end_time)
	return last?.end_time ? new Date(last.end_time) : null
})

const isOwn = (entry: TimeEntry) => entry.user_id === authStore.info?.id
</script>

<template>
	<DetailSection
		v-if="available"
		:title="t('timeTracking.title')"
		:count="entries.length ? formatDuration(total) : undefined"
	>
		<template #actions>
			<UiButton
				v-if="runningHere"
				variant="ghost"
				size="sm"
				:icon="Square"
				:loading="stop.isPending.value"
				class="text-accent hover:text-accent"
				@click="stop.mutate()"
			>
				{{ t('timeTracking.stop') }}
				<span class="font-mono tabular-nums">{{ elapsed }}</span>
			</UiButton>
			<UiButton
				v-else
				variant="ghost"
				size="sm"
				:icon="Play"
				:loading="create.isPending.value"
				class="text-ink-faint"
				@click="startTimer"
			>
				{{ t('timeTracking.start') }}
			</UiButton>
			<UiIconButton
				:icon="Plus"
				:label="t('timeTracking.logTime')"
				size="sm"
				class="-me-1.5 text-ink-faint"
				@click="logTime"
			/>
		</template>
		<ul
			v-if="entries.length"
			role="list"
		>
			<li
				v-for="entry in entries"
				:key="entry.id"
			>
				<TimeEntryRow
					:entry="entry"
					:show-task="false"
					:editable="isOwn(entry)"
					:now="now"
					@edit="edit(entry)"
					@delete="deleteEntry(entry)"
				/>
			</li>
		</ul>
	</DetailSection>

	<TimeEntryDialog
		v-if="available"
		v-model:open="dialogOpen"
		:entry="editing"
		:task="task"
		lock-task
		:suggested-start="suggestedStart"
		@delete="deleteEntry"
	/>
</template>
