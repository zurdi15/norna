<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {ArrowLeft, Bell, BellRing, CalendarClock, SlidersHorizontal, X} from '@lucide/vue'

import type {TaskReminder} from '@/client/generated'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTimeFormat} from '@/composables/useTimeFormat'
import {TIME_FORMAT} from '@/constants/timeFormat'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {
	describeReminder,
	describeReminderPeriod,
	formatScheduleDate,
	isRelativeReminder,
	REMINDER_RELATIVE_TO,
	resolveReminderDate,
	type TaskScheduleDates,
} from '@/modules/task/describe'
import type {IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'
import {cn} from '@/ui/cn'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSelect from '@/ui/UiSelect.vue'

import DatePicker from './DatePicker.vue'
import {
	absoluteReminder,
	hasReminder,
	relativeReminder,
	relativeReminderForm,
	REMINDER_PERIOD_UNITS,
	reminderFromForm,
	reminderPresetGroups,
	removeReminder,
	replaceReminder,
	toggleReminder,
	type RelativeReminderForm,
} from './reminders'

/**
 * A task's reminders: the list, one-tap presets relative to the dates the task has,
 * and forms for a custom offset or a fixed date and time. Every change emits a new list.
 */
const props = withDefaults(defineProps<{
	dueDate?: Date | string | null
	startDate?: Date | string | null
	endDate?: Date | string | null
	class?: HTMLAttributes['class']
}>(), {
	dueDate: null,
	startDate: null,
	endDate: null,
	class: undefined,
})

const model = defineModel<TaskReminder[]>({default: () => []})

const {t, locale} = useI18n()
const {store: timeFormat} = useTimeFormat()
const {now} = useGlobalNow()

const format = computed(() => ({locale: locale.value, hour12: timeFormat.value === TIME_FORMAT.HOURS_12}))
const dates = computed<TaskScheduleDates>(() => ({
	due_date: props.dueDate,
	start_date: props.startDate,
	end_date: props.endDate,
}))
const groups = computed(() => reminderPresetGroups(dates.value))

const rows = computed(() => model.value.map((reminder, index) => {
	const relative = isRelativeReminder(reminder)
	const when = resolveReminderDate(reminder, dates.value)
	return {
		index,
		relative,
		text: describeReminder(reminder, dates.value, t, now.value, format.value),
		// Relative rows name the offset; the moment it lands on goes underneath.
		when: relative && when ? formatScheduleDate(when, now.value, format.value) : null,
		// Past, or relative to a date the task doesn't have: it won't fire.
		inactive: when === null || when.getTime() < now.value.getTime(),
	}
}))

type View =
	| {kind: 'list'}
	| {kind: 'absolute' | 'relative', index: number | null}

const view = ref<View>({kind: 'list'})
const editingIndex = computed(() => view.value.kind === 'list' ? null : view.value.index)

const root = useTemplateRef<HTMLElement>('root')
// Where focus goes back to when a form closes; the list stays mounted (v-show) so it still exists.
let opener: HTMLElement | null = null

async function openView(next: View) {
	opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
	view.value = next
	await nextTick()
	root.value?.querySelector<HTMLElement>('[data-view] [data-autofocus]')?.focus()
}

async function backToList() {
	view.value = {kind: 'list'}
	await nextTick()
	if (opener?.isConnected) {
		opener.focus()
	} else {
		root.value?.focus()
	}
}

function toggle(relativeTo: IReminderPeriodRelativeTo, seconds: number) {
	model.value = toggleReminder(model.value, relativeReminder(relativeTo, seconds))
}

async function remove(index: number) {
	model.value = removeReminder(model.value, index)
	await nextTick()
	// The removed row took the focused button with it: move to the row that took its place.
	const buttons = root.value?.querySelectorAll<HTMLElement>('[data-remove]') ?? []
	const next = buttons[Math.min(index, buttons.length - 1)]
	if (next) {
		next.focus()
	} else {
		root.value?.focus()
	}
}

function edit(index: number) {
	const reminder = model.value[index]
	if (!reminder) {
		return
	}
	if (isRelativeReminder(reminder)) {
		openRelative(index)
	} else {
		openAbsolute(index)
	}
}

// Absolute reminders
const draftDate = ref<Date | null>(null)

function openAbsolute(index: number | null) {
	draftDate.value = index === null ? null : parseDateOrNull(model.value[index]?.reminder)
	openView({kind: 'absolute', index})
}

function saveAbsolute(date: Date | null) {
	if (date) {
		model.value = replaceReminder(model.value, editingIndex.value, absoluteReminder(date))
	}
	backToList()
}

// Relative reminders
const form = ref<RelativeReminderForm>(relativeReminderForm(null, 'due_date'))
// UiInput hands a number back from type="number", or '' while the field is empty.
const amount = ref<string | number | null>('1')

function openRelative(index: number | null) {
	const existing = index === null ? null : model.value[index] ?? null
	form.value = relativeReminderForm(existing, groups.value[0]?.relativeTo ?? 'due_date')
	amount.value = String(form.value.amount)
	openView({kind: 'relative', index})
}

const formReminder = computed(() => reminderFromForm({...form.value, amount: Number(amount.value)}))
const formPreview = computed(() => {
	const date = resolveReminderDate(formReminder.value, dates.value)
	return date ? formatScheduleDate(date, now.value, format.value) : null
})

function saveRelative() {
	model.value = replaceReminder(model.value, editingIndex.value, formReminder.value)
	backToList()
}

const unitItems = computed(() => REMINDER_PERIOD_UNITS.map(unit => ({
	value: unit,
	label: t(`time.units.${unit}`, Number(amount.value) || 0),
})))

const directionItems = computed(() => [
	{value: 'before' as const, label: t('pickers.reminder.beforeLabel')},
	{value: 'after' as const, label: t('pickers.reminder.afterLabel')},
])

// The dates the task has, plus the one an edited reminder already points at.
const relativeToItems = computed(() => REMINDER_RELATIVE_TO
	.filter(relativeTo => relativeTo === form.value.relativeTo || groups.value.some(group => group.relativeTo === relativeTo))
	.map(relativeTo => ({value: relativeTo, label: t(`pickers.reminder.relativeTo.${relativeTo}`)})))

const section = 'px-3 pointer-coarse:px-4'
const touchButton = 'pointer-coarse:h-11 pointer-coarse:px-4 pointer-coarse:text-md'
</script>

<template>
	<div
		ref="root"
		tabindex="-1"
		:class="cn('flex flex-col focus:outline-none', props.class)"
	>
		<div v-show="view.kind === 'list'">
			<ul
				v-if="rows.length"
				class="grid gap-px p-1"
			>
				<li
					v-for="row in rows"
					:key="row.index"
					class="flex items-center gap-1"
				>
					<button
						type="button"
						class="
							flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1
							text-start
							pointer-coarse:min-h-12
							pointer-coarse:active:bg-canvas-subtle
							pointer-fine:hover:bg-canvas-subtle
						"
						@click="edit(row.index)"
					>
						<UiIcon
							:icon="row.relative ? BellRing : Bell"
							:class="row.inactive ? 'text-ink-faint' : 'text-ink-muted'"
						/>
						<span class="min-w-0 flex-1">
							<span
								:class="cn(
									'block truncate',
									row.relative ? 'text-base pointer-coarse:text-md' : 'font-mono text-sm tabular-nums',
									row.inactive && 'text-ink-muted',
								)"
							>{{ row.text }}</span>
							<span
								v-if="row.when"
								class="block font-mono text-2xs text-ink-faint tabular-nums"
							>{{ row.when }}</span>
						</span>
					</button>
					<UiIconButton
						:icon="X"
						:label="t('pickers.reminder.remove')"
						size="sm"
						data-remove
						class="pointer-coarse:size-11"
						@click="remove(row.index)"
					/>
				</li>
			</ul>
			<p
				v-else
				:class="cn('pt-3 text-sm text-ink-faint', section)"
			>
				{{ t('pickers.reminder.empty') }}
			</p>

			<div :class="cn('grid gap-3 py-3', rows.length && 'border-t border-line', section)">
				<div
					v-for="group in groups"
					:key="group.relativeTo"
					class="grid gap-1.5"
				>
					<p class="flex items-baseline gap-2">
						<span class="caption">{{ t(`pickers.reminder.relativeTo.${group.relativeTo}`) }}</span>
						<span class="font-mono text-2xs text-ink-faint tabular-nums">{{ formatScheduleDate(group.date, now, format) }}</span>
					</p>
					<div class="flex flex-wrap gap-1.5">
						<UiChip
							v-for="period in group.periods"
							:key="period"
							as="button"
							:pressed="hasReminder(model, relativeReminder(group.relativeTo, period))"
							class="h-7 px-2 text-sm pointer-coarse:h-11 pointer-coarse:px-3 pointer-coarse:text-md"
							@click="toggle(group.relativeTo, period)"
						>
							{{ describeReminderPeriod(period, group.relativeTo, t, true) }}
						</UiChip>
					</div>
				</div>
				<p
					v-if="!groups.length"
					class="text-xs text-ink-faint"
				>
					{{ t('pickers.reminder.needsDate') }}
				</p>
				<div class="flex flex-wrap gap-2">
					<UiButton
						size="sm"
						:icon="CalendarClock"
						:class="touchButton"
						@click="openAbsolute(null)"
					>
						{{ t('pickers.reminder.addAbsolute') }}
					</UiButton>
					<UiButton
						v-if="groups.length"
						size="sm"
						:icon="SlidersHorizontal"
						:class="touchButton"
						@click="openRelative(null)"
					>
						{{ t('pickers.reminder.addRelative') }}
					</UiButton>
				</div>
			</div>
		</div>

		<div
			v-if="view.kind !== 'list'"
			data-view
		>
			<div class="flex items-center gap-1 border-b border-line px-1.5 py-1 pointer-coarse:px-2">
				<UiIconButton
					:icon="ArrowLeft"
					:label="t('pickers.reminder.back')"
					size="sm"
					class="pointer-coarse:size-11"
					@click="backToList"
				/>
				<p class="text-sm font-medium">
					{{ editingIndex === null ? t('pickers.reminder.newTitle') : t('pickers.reminder.editTitle') }}
				</p>
			</div>

			<DatePicker
				v-if="view.kind === 'absolute'"
				v-model="draftDate"
				:clearable="false"
				:confirm-label="editingIndex === null ? t('pickers.reminder.add') : t('misc.save')"
				@select="saveAbsolute"
			/>

			<template v-else>
				<div :class="cn('grid gap-3 py-3', section)">
					<div class="flex gap-2">
						<UiField
							:label="t('pickers.reminder.amount')"
							hide-label
							class="w-20 shrink-0"
						>
							<UiInput
								v-model="amount"
								type="number"
								min="0"
								inputmode="numeric"
								data-autofocus
								class="min-w-0 font-mono tabular-nums"
								@keydown.enter.prevent="saveRelative"
							/>
						</UiField>
						<UiField
							:label="t('pickers.reminder.unit')"
							hide-label
							class="min-w-0 flex-1"
						>
							<UiSelect
								v-model="form.unit"
								:items="unitItems"
							/>
						</UiField>
					</div>
					<UiSegmented
						v-model="form.direction"
						:items="directionItems"
						:label="t('pickers.reminder.direction')"
						class="flex w-full *:flex-1"
					/>
					<div
						v-if="relativeToItems.length > 1"
						class="grid gap-1.5"
					>
						<p class="caption">
							{{ t('pickers.reminder.relativeToLabel') }}
						</p>
						<UiSegmented
							v-model="form.relativeTo"
							:items="relativeToItems"
							:label="t('pickers.reminder.relativeToLabel')"
							class="flex w-full *:flex-1"
						/>
					</div>
					<div class="flex items-start gap-2.5 rounded-md bg-canvas-subtle px-2.5 py-2">
						<UiIcon
							:icon="BellRing"
							class="mt-0.5 text-ink-faint"
						/>
						<div class="min-w-0">
							<p class="text-sm text-ink">
								{{ describeReminderPeriod(formReminder.relative_period ?? 0, form.relativeTo, t) }}
							</p>
							<p
								v-if="formPreview"
								class="font-mono text-2xs text-ink-faint tabular-nums"
							>
								{{ formPreview }}
							</p>
						</div>
					</div>
				</div>
				<div :class="cn('flex justify-end gap-2 border-t border-line py-2', section)">
					<UiButton
						size="sm"
						:class="touchButton"
						@click="backToList"
					>
						{{ t('misc.cancel') }}
					</UiButton>
					<UiButton
						variant="primary"
						size="sm"
						:class="touchButton"
						@click="saveRelative"
					>
						{{ editingIndex === null ? t('pickers.reminder.add') : t('misc.save') }}
					</UiButton>
				</div>
			</template>
		</div>
	</div>
</template>
