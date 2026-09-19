import {calculateNearestHours} from '@/helpers/time/calculateNearestHours'
import {isSameDay} from '@/helpers/time/dateMath'

export interface TimeOfDay {
	hours: number
	minutes: number
}

export interface TimeOfDayFormatOptions {
	locale: string
	hour12: boolean
}

const MINUTES_A_DAY = 24 * 60

/**
 * Reads what people type into a time field: "14:30", "14.30", "14h30", "1430", "930",
 * "9", "9am", "9:30 pm", and the locale forms of the meridiem such as "9:30 p. m.".
 */
export function parseTimeOfDay(text: string | null | undefined): TimeOfDay | null {
	const compact = (text ?? '').toLowerCase().replace(/\s+/g, '')
	const match = /^(\d{1,2})(?:[:.,h]?(\d{2}))?h?(?:([ap])\.?(?:m\.?)?)?$/.exec(compact)
	if (!match) {
		return null
	}
	let hours = Number(match[1])
	const minutes = match[2] === undefined ? 0 : Number(match[2])
	const meridiem = match[3]
	if (minutes > 59) {
		return null
	}
	if (meridiem) {
		if (hours < 1 || hours > 12) {
			return null
		}
		hours = hours % 12 + (meridiem === 'p' ? 12 : 0)
	} else if (hours > 23) {
		return null
	}
	return {hours, minutes}
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** "09:30" on a 24-hour clock, "9:30 AM" (or the locale's meridiem) on a 12-hour one. */
export function formatTimeOfDay(time: TimeOfDay | Date, {locale, hour12}: TimeOfDayFormatOptions): string {
	const key = `${locale}|${hour12}`
	let formatter = formatters.get(key)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, hour12
			? {hour: 'numeric', minute: '2-digit', hour12: true}
			: {hour: '2-digit', minute: '2-digit', hour12: false})
		formatters.set(key, formatter)
	}
	const date = time instanceof Date ? time : new Date(2000, 0, 1, time.hours, time.minutes)
	return formatter.format(date)
}

export function timeOfDayOf(date: Date): TimeOfDay {
	return {hours: date.getHours(), minutes: date.getMinutes()}
}

export function isSameTimeOfDay(a: TimeOfDay | null | undefined, b: TimeOfDay | null | undefined): boolean {
	return Boolean(a && b) && a!.hours === b!.hours && a!.minutes === b!.minutes
}

/** Moves the time by whole minutes, wrapping around midnight. */
export function stepTimeOfDay(time: TimeOfDay, deltaMinutes: number): TimeOfDay {
	const total = ((time.hours * 60 + time.minutes + deltaMinutes) % MINUTES_A_DAY + MINUTES_A_DAY) % MINUTES_A_DAY
	return {hours: Math.floor(total / 60), minutes: total % 60}
}

export function withTimeOfDay(date: Date, time: TimeOfDay): Date {
	const result = new Date(date)
	result.setHours(time.hours, time.minutes, 0, 0)
	return result
}

/**
 * The time a freshly picked day gets: the user's default due time ("HH:MM") when set,
 * else the next of 9/12/15/18/21 for today and 9:00 for any other day.
 */
export function defaultTimeOfDay(day: Date, now: Date, userDefault?: string | null): TimeOfDay {
	const configured = userDefault ? parseTimeOfDay(userDefault) : null
	if (configured) {
		return configured
	}
	return {hours: isSameDay(day, now) ? calculateNearestHours(now) : 9, minutes: 0}
}
