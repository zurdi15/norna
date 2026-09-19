import type {TaskReminder} from '@/client/generated'
import {SECONDS_A_DAY} from '@/constants/date'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {startOfDay} from '@/helpers/time/dateMath'
import {secondsToPeriod} from '@/helpers/time/period'
import {parseRepeatAfter} from '@/modules/task/repeat'
import {formatTimeOfDay, type TimeOfDayFormatOptions} from '@/helpers/time/timeOfDay'
import {REPEAT_TYPES, type IRepeatAfter} from '@/types/IRepeatAfter'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'
import {REMINDER_PERIOD_RELATIVE_TO_TYPES, type IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'

/** The slice of vue-i18n's `t` these helpers call, so they stay testable without a component. */
export interface Translate {
	(key: string, named?: Record<string, unknown>): string
	(key: string, plural: number): string
}

export type ScheduleFormatOptions = TimeOfDayFormatOptions

/** The dates a relative reminder can point at, as the api (ISO strings, zero time) or forms (Date, null) hold them. */
export type TaskScheduleDates = Partial<Record<IReminderPeriodRelativeTo, Date | string | null>>

export const REMINDER_RELATIVE_TO: readonly IReminderPeriodRelativeTo[] = [
	REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE,
	REMINDER_PERIOD_RELATIVE_TO_TYPES.STARTDATE,
	REMINDER_PERIOD_RELATIVE_TO_TYPES.ENDDATE,
]

export type RelativeReminder = TaskReminder & {relative_to: IReminderPeriodRelativeTo}

export function isRelativeReminder(reminder: TaskReminder): reminder is RelativeReminder {
	return REMINDER_RELATIVE_TO.includes(reminder.relative_to as IReminderPeriodRelativeTo)
}

/**
 * When the reminder fires. Relative reminders are computed from the task's current
 * dates rather than the api's resolved `reminder`, which goes stale while editing.
 */
export function resolveReminderDate(reminder: TaskReminder, task: TaskScheduleDates): Date | null {
	if (isRelativeReminder(reminder)) {
		const base = parseDateOrNull(task[reminder.relative_to])
		return base ? new Date(base.getTime() + (reminder.relative_period ?? 0) * 1000) : null
	}
	return parseDateOrNull(reminder.reminder)
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function dateParts(date: Date, locale: string, withYear: boolean): string {
	const key = `${locale}|${withYear}`
	let formatter = formatters.get(key)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, withYear
			? {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}
			: {weekday: 'short', day: 'numeric', month: 'short'})
		formatters.set(key, formatter)
	}
	// Intl puts a comma after the weekday ("vie, 19 sept"); the mono rows read better without it.
	return formatter.formatToParts(date)
		.map(part => part.type === 'literal' ? part.value.replace(',', '') : part.value)
		.join('')
		.replace(/\s+/g, ' ')
		.trim()
}

const relativeDayFormatters = new Map<string, Intl.RelativeTimeFormat>()

function relativeDay(days: number, locale: string): string {
	let formatter = relativeDayFormatters.get(locale)
	if (!formatter) {
		formatter = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'})
		relativeDayFormatters.set(locale, formatter)
	}
	return formatter.format(days, 'day')
}

/**
 * The compact date and time of pickers and reminders: "mañana · 09:00", "vie 19 sept · 09:00",
 * with the year only when it isn't the current one.
 */
export function formatScheduleDate(date: Date, now: Date, options: ScheduleFormatOptions): string {
	const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / (SECONDS_A_DAY * 1000))
	const day = Math.abs(days) <= 1
		? relativeDay(days, options.locale)
		: dateParts(date, options.locale, date.getFullYear() !== now.getFullYear())
	return `${day} · ${formatTimeOfDay(date, options)}`
}

/**
 * A reminder offset such as "1 h before due date" or, with `short`, "1 h before" for
 * lists already grouped by the date they point at.
 */
export function describeReminderPeriod(
	seconds: number,
	relativeTo: IReminderPeriodRelativeTo,
	t: Translate,
	short = false,
): string {
	if (seconds === 0) {
		return short ? t('pickers.reminder.short.at') : t(`pickers.reminder.at.${relativeTo}`)
	}
	const {unit, amount} = secondsToPeriod(Math.abs(seconds))
	const period = t(`pickers.unitShort.${unit}`, amount)
	const direction = seconds < 0 ? 'before' : 'after'
	return short
		? t(`pickers.reminder.short.${direction}`, {period})
		: t(`pickers.reminder.${direction}.${relativeTo}`, {period})
}

const DEFAULT_FORMAT: ScheduleFormatOptions = {locale: 'en', hour12: false}

/**
 * The reminder as task property rows show it: "1 h antes del vencimiento" for relative
 * reminders (marked when the task lacks that date, so it can't fire) and the date and
 * time for absolute ones.
 */
export function describeReminder(
	reminder: TaskReminder,
	task: TaskScheduleDates,
	t: Translate,
	now: Date = new Date(),
	options: ScheduleFormatOptions = DEFAULT_FORMAT,
): string {
	if (isRelativeReminder(reminder)) {
		const text = describeReminderPeriod(reminder.relative_period ?? 0, reminder.relative_to, t)
		return parseDateOrNull(task[reminder.relative_to]) ? text : t('pickers.reminder.inactive', {text})
	}
	const date = parseDateOrNull(reminder.reminder)
	return date ? formatScheduleDate(date, now, options) : ''
}

export interface RepeatSettings {
	repeat_after: number
	repeat_mode: number
}

export interface ReadRepeat {
	// null when the task doesn't repeat.
	interval: IRepeatAfter | null
	fromCompletion: boolean
}

/** The largest whole unit for a stored interval; see parseRepeatAfter. */
export function repeatIntervalFromSeconds(seconds: number): IRepeatAfter {
	return parseRepeatAfter(seconds)
}

/** The interval and mode behind a task's repeat_after and repeat_mode. */
export function readRepeat(repeatAfter: number | null | undefined, repeatMode: number | null | undefined): ReadRepeat {
	if (repeatMode === TASK_REPEAT_MODES.REPEAT_MODE_MONTH) {
		return {interval: {type: REPEAT_TYPES.Months, amount: 1}, fromCompletion: false}
	}
	if (!repeatAfter || repeatAfter <= 0) {
		return {interval: null, fromCompletion: false}
	}
	return {
		interval: repeatIntervalFromSeconds(repeatAfter),
		fromCompletion: repeatMode === TASK_REPEAT_MODES.REPEAT_MODE_FROM_CURRENT_DATE,
	}
}

export function describeRepeatInterval(interval: IRepeatAfter, t: Translate): string {
	return t(`pickers.repeat.every.${interval.type}`, interval.amount)
}

/** "Cada 2 semanas", "Cada mes · desde que se completa", or "No se repite". */
export function describeRepeat(repeatAfter: number | null | undefined, repeatMode: number | null | undefined, t: Translate): string {
	const {interval, fromCompletion} = readRepeat(repeatAfter, repeatMode)
	if (!interval) {
		return t('pickers.repeat.none')
	}
	const text = describeRepeatInterval(interval, t)
	return fromCompletion ? t('pickers.repeat.fromCompletion', {interval: text}) : text
}
