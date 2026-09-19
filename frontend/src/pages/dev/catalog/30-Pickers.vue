<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Bell, CalendarArrowUp, CalendarDays, Repeat} from '@lucide/vue'

import type {TaskReminder} from '@/client/generated'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTimeFormat} from '@/composables/useTimeFormat'
import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_WEEK} from '@/constants/date'
import {TIME_FORMAT} from '@/constants/timeFormat'
import DatePicker from '@/features/tasks/pickers/DatePicker.vue'
import ReminderEditor from '@/features/tasks/pickers/ReminderEditor.vue'
import RepeatEditor from '@/features/tasks/pickers/RepeatEditor.vue'
import {describeReminder, describeRepeat, formatScheduleDate} from '@/modules/task/describe'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

// Dev-only section: the copy is sample content, not translated UI.
const {t, locale} = useI18n()
const {now} = useGlobalNow()
const {store: timeFormat} = useTimeFormat()
const format = computed(() => ({locale: locale.value, hour12: timeFormat.value === TIME_FORMAT.HOURS_12}))

function tomorrowAt(hours: number): Date {
	const date = new Date()
	date.setDate(date.getDate() + 1)
	date.setHours(hours, 0, 0, 0)
	return date
}

const due = ref<Date | null>(tomorrowAt(10))
const start = ref<Date | null>(null)
const reminders = ref<TaskReminder[]>([
	{relative_to: 'due_date', relative_period: -SECONDS_A_HOUR},
	{relative_to: 'start_date', relative_period: -SECONDS_A_DAY},
])
const repeat = ref({repeat_after: 2 * SECONDS_A_WEEK, repeat_mode: 0})

const dueOpen = ref(false)
const startOpen = ref(false)
const repeatOpen = ref(false)

const dates = computed(() => ({due_date: due.value, start_date: start.value}))
const reminderTexts = computed(() => reminders.value.map(reminder => describeReminder(reminder, dates.value, t, now.value, format.value)))

const payload = computed(() => JSON.stringify({
	due_date: due.value?.toISOString() ?? null,
	start_date: start.value?.toISOString() ?? null,
	reminders: reminders.value,
	...repeat.value,
}, null, 2))

const row = 'grid items-center gap-1.5 sm:grid-cols-[8rem_1fr] sm:gap-3'
</script>

<template>
	<section class="grid gap-4">
		<UiSectionHeading
			title="Selectores de planificación"
			caption="Fechas · recordatorios · repetición"
		/>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="grid content-start gap-3 rounded-lg border border-line bg-surface p-4">
				<div :class="row">
					<span class="caption">Vencimiento</span>
					<UiAdaptivePopover
						v-model:open="dueOpen"
						title="Fecha de vencimiento"
						class="w-80"
					>
						<template #trigger>
							<UiButton
								:icon="CalendarDays"
								class="justify-start font-mono text-sm"
							>
								{{ due ? formatScheduleDate(due, now, format) : 'Sin fecha' }}
							</UiButton>
						</template>
						<DatePicker
							v-model="due"
							@select="dueOpen = false"
						/>
					</UiAdaptivePopover>
				</div>

				<div :class="row">
					<span class="caption">Inicio</span>
					<UiAdaptivePopover
						v-model:open="startOpen"
						title="Fecha de inicio"
						class="w-80"
					>
						<template #trigger>
							<UiButton
								:icon="CalendarArrowUp"
								class="justify-start font-mono text-sm"
							>
								{{ start ? formatScheduleDate(start, now, format) : 'Sin fecha' }}
							</UiButton>
						</template>
						<DatePicker
							v-model="start"
							@select="startOpen = false"
						/>
					</UiAdaptivePopover>
				</div>

				<div :class="row">
					<span class="caption">Recordatorios</span>
					<UiAdaptivePopover
						title="Recordatorios"
						class="w-80"
					>
						<template #trigger>
							<UiButton
								:icon="Bell"
								class="h-auto min-h-8.5 justify-start py-1.5 text-start whitespace-normal"
							>
								<span class="grid gap-0.5">
									<span
										v-for="(text, i) in reminderTexts"
										:key="i"
									>{{ text }}</span>
									<span
										v-if="!reminderTexts.length"
										class="text-ink-faint"
									>Sin recordatorios</span>
								</span>
							</UiButton>
						</template>
						<ReminderEditor
							v-model="reminders"
							:due-date="due"
							:start-date="start"
						/>
					</UiAdaptivePopover>
				</div>

				<div :class="row">
					<span class="caption">Repetir</span>
					<UiAdaptivePopover
						v-model:open="repeatOpen"
						title="Repetir"
						class="w-80"
					>
						<template #trigger>
							<UiButton
								:icon="Repeat"
								class="justify-start"
							>
								{{ describeRepeat(repeat.repeat_after, repeat.repeat_mode, t) }}
							</UiButton>
						</template>
						<RepeatEditor
							v-model="repeat"
							@select="repeatOpen = false"
						/>
					</UiAdaptivePopover>
				</div>
			</div>

			<pre class="overflow-x-auto rounded-lg border border-line bg-canvas-subtle p-4 font-mono text-2xs text-ink-muted">{{ payload }}</pre>
		</div>
	</section>
</template>
