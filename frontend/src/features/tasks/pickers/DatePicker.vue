<script setup lang="ts">
import {computed, ref, useTemplateRef, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {CalendarX2, CornerDownRight, Sparkles} from '@lucide/vue'

import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTimeFormat} from '@/composables/useTimeFormat'
import {TIME_FORMAT} from '@/constants/timeFormat'
import {isSameDay, startOfDay} from '@/helpers/time/dateMath'
import {buildDateShortcuts, type DateShortcut} from '@/helpers/time/dateShortcuts'
import {defaultTimeOfDay, timeOfDayOf, withTimeOfDay, type TimeOfDay} from '@/helpers/time/timeOfDay'
import {formatScheduleDate} from '@/modules/task/describe'
import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiKbd from '@/ui/UiKbd.vue'

import {formatDayHint} from './format'
import {parseNaturalDate} from '@/modules/quickAddMagic/naturalDate'
import TimeField from './TimeField.vue'

/**
 * Date and time picker content: typed dates, shortcuts, a calendar and a time field.
 * The model follows every change; `select` marks a finished pick so callers can close.
 */
const props = withDefaults(defineProps<{
	clearable?: boolean
	// The finish button's text; "Done" by default.
	confirmLabel?: string
	class?: HTMLAttributes['class']
}>(), {
	clearable: true,
	confirmLabel: undefined,
	class: undefined,
})

const emit = defineEmits<{
	select: [value: Date | null]
}>()

const model = defineModel<Date | null>({default: null})

const {t, locale} = useI18n()
const authStore = useAuthStore()
const {store: timeFormat} = useTimeFormat()
const {now} = useGlobalNow()
const {hasFinePointer} = useBreakpoints()

const format = computed(() => ({locale: locale.value, hour12: timeFormat.value === TIME_FORMAT.HOURS_12}))
const weekStart = computed(() => authStore.settings.week_start)

// A newly picked day keeps the time already set, else it gets the user's default time.
function withTime(day: Date, previous: Date | null): Date {
	return withTimeOfDay(day, previous
		? timeOfDayOf(previous)
		: defaultTimeOfDay(day, now.value, authStore.settings.frontend_settings.default_due_time))
}

function commit(value: Date | null) {
	model.value = value
	emit('select', value)
}

const query = ref('')
const trimmedQuery = computed(() => query.value.trim())
const parsedDate = computed(() => {
	if (trimmedQuery.value === '') {
		return null
	}
	const parsed = parseNaturalDate(trimmedQuery.value, now.value, {dayFirst: !locale.value.startsWith('en')})
	if (!parsed) {
		return null
	}
	return parsed.hasTime ? parsed.date : withTime(parsed.date, model.value)
})

function applyQuery() {
	if (trimmedQuery.value === '') {
		emit('select', model.value)
		return
	}
	if (parsedDate.value) {
		const date = parsedDate.value
		query.value = ''
		commit(date)
	}
}

const shortcuts = computed(() => buildDateShortcuts(now.value).map(shortcut => ({
	...shortcut,
	label: t(`pickers.date.shortcuts.${shortcut.key}`),
	hint: formatDayHint(shortcut.date, now.value, locale.value),
})))

function pickShortcut(shortcut: DateShortcut) {
	commit(withTime(shortcut.date, model.value))
}

const calendarValue = computed<Date | null>({
	get: () => model.value,
	set: value => {
		if (value) {
			model.value = model.value ? value : withTime(value, null)
		}
	},
})

const time = computed<TimeOfDay | null>({
	get: () => model.value ? timeOfDayOf(model.value) : null,
	set: value => {
		if (value) {
			model.value = withTimeOfDay(model.value ?? startOfDay(now.value), value)
		}
	},
})
const placeholderTime = computed(() => defaultTimeOfDay(
	model.value ?? now.value,
	now.value,
	authStore.settings.frontend_settings.default_due_time,
))

const input = useTemplateRef<HTMLInputElement>('input')
const chipList = useTemplateRef<HTMLElement>('chips')

function chipButtons(): HTMLElement[] {
	return Array.from(chipList.value?.querySelectorAll<HTMLElement>('button') ?? [])
}

function onInputKeydown(event: KeyboardEvent) {
	if (event.isComposing) {
		return
	}
	if (event.key === 'Enter') {
		event.preventDefault()
		applyQuery()
	} else if (event.key === 'ArrowDown') {
		event.preventDefault()
		chipButtons()[0]?.focus()
	}
}

const CHIP_MOVES: Record<string, number> = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}

// The shortcuts read as one list: arrows walk it, and stepping back past the first returns to the text field.
function onChipsKeydown(event: KeyboardEvent) {
	const buttons = chipButtons()
	const index = buttons.indexOf(event.target as HTMLElement)
	if (index < 0) {
		return
	}
	let next: number | undefined
	if (event.key in CHIP_MOVES) {
		next = index + CHIP_MOVES[event.key]!
	} else if (event.key === 'Home') {
		next = 0
	} else if (event.key === 'End') {
		next = buttons.length - 1
	}
	if (next === undefined) {
		return
	}
	event.preventDefault()
	if (next < 0) {
		input.value?.focus()
	} else {
		buttons[Math.min(next, buttons.length - 1)]?.focus()
	}
}

const section = 'px-3 pointer-coarse:px-4'
</script>

<template>
	<!-- On touch the sheet focuses the picker itself: focusing the text field would open the keyboard over the calendar. -->
	<div
		:tabindex="hasFinePointer ? undefined : -1"
		:data-autofocus="hasFinePointer ? undefined : ''"
		:class="cn('flex flex-col focus:outline-none', props.class)"
	>
		<div :class="cn('flex items-center gap-2 border-b border-line', section)">
			<UiIcon
				:icon="Sparkles"
				class="text-ink-faint"
			/>
			<input
				ref="input"
				v-model="query"
				type="text"
				:data-autofocus="hasFinePointer ? '' : undefined"
				:aria-label="t('pickers.date.inputLabel')"
				:placeholder="t('pickers.date.placeholder')"
				autocomplete="off"
				spellcheck="false"
				enterkeyhint="done"
				class="
					h-10 min-w-0 flex-1 bg-transparent text-base
					placeholder:text-ink-faint
					focus:outline-none
					pointer-coarse:h-12 pointer-coarse:text-lg
				"
				@keydown="onInputKeydown"
			>
		</div>

		<div aria-live="polite">
			<div
				v-if="trimmedQuery"
				class="border-b border-line p-1"
			>
				<button
					v-if="parsedDate"
					type="button"
					class="
						flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm bg-canvas-subtle px-2 text-start
						text-ink
						pointer-coarse:h-11
					"
					:aria-label="t('pickers.date.apply', {date: formatScheduleDate(parsedDate, now, format)})"
					@click="applyQuery"
				>
					<UiIcon
						:icon="CornerDownRight"
						class="text-accent"
					/>
					<span class="min-w-0 flex-1 truncate font-mono text-xs pointer-coarse:text-sm">
						{{ formatScheduleDate(parsedDate, now, format) }}
					</span>
					<UiKbd
						shortcut="Enter"
						class="hidden pointer-fine:inline-flex"
					/>
				</button>
				<p
					v-else
					class="flex h-8 items-center px-2 text-xs text-ink-faint pointer-coarse:h-11 pointer-coarse:text-sm"
				>
					{{ t('pickers.date.noMatch') }}
				</p>
			</div>
		</div>

		<div
			ref="chips"
			role="group"
			:aria-label="t('pickers.date.shortcutsLabel')"
			:class="cn(
				'flex flex-wrap gap-1.5 pt-3',
				// One swipeable row on touch, where wrapped 44px chips would push the calendar off the sheet.
				'pointer-coarse:scrollbar-none pointer-coarse:flex-nowrap pointer-coarse:overflow-x-auto',
				section,
			)"
			@keydown="onChipsKeydown"
		>
			<UiChip
				v-for="shortcut in shortcuts"
				:key="shortcut.key"
				as="button"
				:pressed="isSameDay(shortcut.date, model)"
				class="h-7 px-2 text-sm pointer-coarse:h-11 pointer-coarse:px-3 pointer-coarse:text-md"
				@click="pickShortcut(shortcut)"
			>
				{{ shortcut.label }}<span
					:class="cn(
						'ms-1.5 font-mono text-2xs tabular-nums pointer-coarse:text-xs',
						isSameDay(shortcut.date, model) ? 'text-accent' : 'text-ink-faint',
					)"
				>{{ shortcut.hint }}</span>
			</UiChip>
		</div>

		<div :class="cn('pt-3', section)">
			<UiCalendar
				v-model="calendarValue"
				:week-starts-on="weekStart"
			/>
		</div>

		<div :class="cn('mt-2 border-t border-line py-2.5', section)">
			<TimeField
				v-model="time"
				:placeholder="placeholderTime"
				@commit="emit('select', model)"
			/>
		</div>

		<div :class="cn('flex items-center gap-2 border-t border-line py-2', section)">
			<UiButton
				v-if="clearable && model"
				variant="ghost"
				size="sm"
				:icon="CalendarX2"
				class="-ms-2 pointer-coarse:h-11 pointer-coarse:text-md"
				@click="commit(null)"
			>
				{{ t('pickers.date.clear') }}
			</UiButton>
			<UiButton
				variant="primary"
				size="sm"
				:disabled="!clearable && !model"
				class="ms-auto pointer-coarse:h-11 pointer-coarse:px-5 pointer-coarse:text-md"
				@click="emit('select', model)"
			>
				{{ confirmLabel ?? t('pickers.date.done') }}
			</UiButton>
		</div>
	</div>
</template>
