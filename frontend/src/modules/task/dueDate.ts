import {addDays, isSameDay, startOfDay} from '@/helpers/time/dateMath'

export type DueState = 'overdue' | 'today' | 'future'

/** How pressing a date is: past its moment, later today, or on a later day. */
export function dueState(date: Date, now: Date): DueState {
	if (date.getTime() < now.getTime()) {
		return 'overdue'
	}
	return isSameDay(date, now) ? 'today' : 'future'
}

function dayDistance(date: Date, now: Date): number {
	return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000)
}

export interface TaskDateFormatOptions {
	locale: string
	hour12: boolean
}

// Intl formatters are expensive to build and rows format many dates.
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = `${locale}|${JSON.stringify(options)}`
	let cached = formatters.get(key)
	if (!cached) {
		cached = new Intl.DateTimeFormat(locale, options)
		formatters.set(key, cached)
	}
	return cached
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>()

function relativeDay(days: number, locale: string): string {
	let cached = relativeFormatters.get(locale)
	if (!cached) {
		cached = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'})
		relativeFormatters.set(locale, cached)
	}
	return cached.format(days, 'day')
}

export function formatTime(date: Date, {locale, hour12}: TaskDateFormatOptions): string {
	return formatter(locale, {hour: 'numeric', minute: '2-digit', hour12}).format(date)
}

function hasTime(date: Date): boolean {
	return date.getHours() !== 0 || date.getMinutes() !== 0
}

/**
 * The compact date of task rows: "hoy 18:00", "mañana", "lun 21", "21 sept", "21 sept 2027".
 * The time shows only around today, where it changes what to do next.
 */
export function formatTaskDate(date: Date, now: Date, options: TaskDateFormatOptions): string {
	const days = dayDistance(date, now)
	if (Math.abs(days) <= 1) {
		const day = relativeDay(days, options.locale)
		return hasTime(date) ? `${day} ${formatTime(date, options)}` : day
	}
	if (Math.abs(days) < 7) {
		// Built from parts: English would otherwise put the day before the weekday ("21 Mon").
		const parts = formatter(options.locale, {weekday: 'short', day: 'numeric'}).formatToParts(date)
		const weekday = parts.find(part => part.type === 'weekday')?.value ?? ''
		const day = parts.find(part => part.type === 'day')?.value ?? ''
		return `${weekday} ${day}`
	}
	const sameYear = date.getFullYear() === now.getFullYear()
	return formatter(options.locale, sameYear
		? {day: 'numeric', month: 'short'}
		: {day: 'numeric', month: 'short', year: 'numeric'},
	).format(date)
}

/** A date with its time, for property rows: "hoy 18:00", "lun 21 · 18:00", "3 oct · 9:00". */
export function formatTaskDateTime(date: Date, now: Date, options: TaskDateFormatOptions): string {
	const short = formatTaskDate(date, now, options)
	if (Math.abs(dayDistance(date, now)) <= 1 || !hasTime(date)) {
		return short
	}
	return `${short} · ${formatTime(date, options)}`
}

/** The full date for headings and property rows: "lunes, 21 de septiembre". */
export function formatLongDate(date: Date, now: Date, {locale}: Pick<TaskDateFormatOptions, 'locale'>): string {
	const sameYear = date.getFullYear() === now.getFullYear()
	return formatter(locale, sameYear
		? {weekday: 'long', day: 'numeric', month: 'long'}
		: {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'},
	).format(date)
}

/** The start of the day `days` from today, for building date ranges. */
export function dayFromToday(days: number, now: Date): Date {
	return startOfDay(addDays(now, days))
}

/** The ISO 8601 week number (weeks start on Monday; week 1 holds the first Thursday). */
export function isoWeek(date: Date): number {
	const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
	// Shift to the Thursday of this week: its year is the week's year.
	day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
	const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
	return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}
