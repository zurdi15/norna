<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {RELATIVE_REMINDER_PRESETS} from '@/features/tasks/pickers/reminders'
import {describeReminderPeriod} from '@/modules/task/describe'
import type {QuickAddDefaultReminder} from '@/modules/settings/userSettings'
import UiChip from '@/ui/UiChip.vue'

/**
 * The reminders quick add gives a task that gets a due date: one toggle per usual
 * offset from the due date. Offsets set elsewhere show too, and a tap removes them.
 */
defineProps<{
	label: string
}>()

const model = defineModel<readonly QuickAddDefaultReminder[]>({default: () => []})

const {t} = useI18n()

const periods = computed(() => {
	const stored = model.value.map(reminder => reminder.relative_period)
	// Closest to the due date first, as the task's reminder presets.
	return [...new Set([...RELATIVE_REMINDER_PRESETS.due_date, ...stored])]
		.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)
})

const isOn = (seconds: number) => model.value.some(reminder => reminder.relative_period === seconds)

function toggle(seconds: number) {
	model.value = isOn(seconds)
		? model.value.filter(reminder => reminder.relative_period !== seconds)
		: [...model.value, {relative_period: seconds, relative_to: 'due_date'}]
}
</script>

<template>
	<div
		role="group"
		:aria-label="label"
		class="flex flex-wrap gap-1.5"
	>
		<UiChip
			v-for="seconds in periods"
			:key="seconds"
			as="button"
			:pressed="isOn(seconds)"
			class="pointer-coarse:h-11 pointer-coarse:px-3"
			@click="toggle(seconds)"
		>
			{{ describeReminderPeriod(seconds, 'due_date', t, true) }}
		</UiChip>
	</div>
</template>
