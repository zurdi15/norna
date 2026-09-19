import type {TaskReminder} from '@/client/generated'
import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_MINUTE, SECONDS_A_WEEK} from '@/constants/date'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {periodToSeconds, secondsToPeriod} from '@/helpers/time/period'
import {isRelativeReminder, REMINDER_RELATIVE_TO, type TaskScheduleDates} from '@/modules/task/describe'
import type {IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'

/** Offsets in seconds offered as one-tap reminders for each date the task has. */
export const RELATIVE_REMINDER_PRESETS: Record<IReminderPeriodRelativeTo, readonly number[]> = {
	due_date: [0, -15 * SECONDS_A_MINUTE, -SECONDS_A_HOUR, -SECONDS_A_DAY, -SECONDS_A_WEEK],
	start_date: [0, -SECONDS_A_HOUR, -SECONDS_A_DAY],
	end_date: [0, -SECONDS_A_HOUR, -SECONDS_A_DAY],
}

export interface ReminderPresetGroup {
	relativeTo: IReminderPeriodRelativeTo
	date: Date
	periods: readonly number[]
}

/** Preset groups for the dates the task actually has: a relative reminder to a missing date never fires. */
export function reminderPresetGroups(dates: TaskScheduleDates): ReminderPresetGroup[] {
	return REMINDER_RELATIVE_TO.flatMap(relativeTo => {
		const date = parseDateOrNull(dates[relativeTo])
		return date ? [{relativeTo, date, periods: RELATIVE_REMINDER_PRESETS[relativeTo]}] : []
	})
}

export function relativeReminder(relativeTo: IReminderPeriodRelativeTo, seconds: number): TaskReminder {
	// `|| 0` keeps -0 (a negated zero offset) out of the payload.
	return {relative_to: relativeTo, relative_period: seconds || 0}
}

export function absoluteReminder(date: Date): TaskReminder {
	return {reminder: date.toISOString()}
}

export function sameReminder(a: TaskReminder, b: TaskReminder): boolean {
	if (isRelativeReminder(a) || isRelativeReminder(b)) {
		return a.relative_to === b.relative_to && (a.relative_period ?? 0) === (b.relative_period ?? 0)
	}
	const dateA = parseDateOrNull(a.reminder)
	const dateB = parseDateOrNull(b.reminder)
	return dateA !== null && dateB !== null && dateA.getTime() === dateB.getTime()
}

export function hasReminder(list: readonly TaskReminder[], reminder: TaskReminder): boolean {
	return list.some(existing => sameReminder(existing, reminder))
}

/** Adds the reminder, or removes it (and any duplicates) when the list already has it. */
export function toggleReminder(list: readonly TaskReminder[], reminder: TaskReminder): TaskReminder[] {
	return hasReminder(list, reminder)
		? list.filter(existing => !sameReminder(existing, reminder))
		: [...list, reminder]
}

/**
 * Puts the reminder at `index` (appends when null). An edit that lands on another
 * reminder already in the list merges into it instead of duplicating it.
 */
export function replaceReminder(list: readonly TaskReminder[], index: number | null, reminder: TaskReminder): TaskReminder[] {
	const others = list.filter((_, i) => i !== index)
	if (hasReminder(others, reminder)) {
		return others
	}
	if (index === null || index < 0 || index >= list.length) {
		return [...list, reminder]
	}
	return list.map((existing, i) => i === index ? reminder : existing)
}

export function removeReminder(list: readonly TaskReminder[], index: number): TaskReminder[] {
	return list.filter((_, i) => i !== index)
}

export type ReminderPeriodUnit = 'minutes' | 'hours' | 'days' | 'weeks'
export const REMINDER_PERIOD_UNITS: readonly ReminderPeriodUnit[] = ['minutes', 'hours', 'days', 'weeks']

export interface RelativeReminderForm {
	amount: number
	unit: ReminderPeriodUnit
	direction: 'before' | 'after'
	relativeTo: IReminderPeriodRelativeTo
}

/** The custom reminder form for an existing relative reminder, or "1 hour before" for a new one. */
export function relativeReminderForm(reminder: TaskReminder | null, fallbackRelativeTo: IReminderPeriodRelativeTo): RelativeReminderForm {
	const relative = reminder && isRelativeReminder(reminder) ? reminder : null
	const seconds = relative ? relative.relative_period ?? 0 : -SECONDS_A_HOUR
	const relativeTo = relative?.relative_to ?? fallbackRelativeTo
	if (seconds === 0) {
		return {amount: 0, unit: 'hours', direction: 'before', relativeTo}
	}
	const period = secondsToPeriod(Math.abs(seconds))
	return {
		amount: period.amount,
		unit: period.unit as ReminderPeriodUnit,
		direction: seconds < 0 ? 'before' : 'after',
		relativeTo,
	}
}

export function reminderFromForm(form: RelativeReminderForm): TaskReminder {
	const amount = Number.isFinite(form.amount) ? Math.max(0, Math.round(form.amount)) : 0
	const seconds = periodToSeconds(amount, form.unit)
	return relativeReminder(form.relativeTo, form.direction === 'before' ? -seconds : seconds)
}
