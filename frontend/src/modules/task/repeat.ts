import {
	SECONDS_A_DAY,
	SECONDS_A_HOUR,
	SECONDS_A_MINUTE,
	SECONDS_A_MONTH,
	SECONDS_A_WEEK,
	SECONDS_A_YEAR,
} from '@/constants/date'
import {REPEAT_TYPES, type IRepeatAfter, type IRepeatType} from '@/types/IRepeatAfter'
import {TASK_REPEAT_MODES, type IRepeatMode} from '@/types/IRepeatMode'

export type RepeatAfter = IRepeatAfter

const SECONDS_PER_UNIT: Record<IRepeatType, number> = {
	seconds: 1,
	minutes: SECONDS_A_MINUTE,
	hours: SECONDS_A_HOUR,
	days: SECONDS_A_DAY,
	weeks: SECONDS_A_WEEK,
	months: SECONDS_A_MONTH,
	years: SECONDS_A_YEAR,
}

// Largest first. Months and years have no fixed length; the api repeats them as 30- and 365-day blocks.
const UNITS_LARGEST_FIRST: readonly [IRepeatType, number][] = [
	[REPEAT_TYPES.Years, SECONDS_A_YEAR],
	[REPEAT_TYPES.Months, SECONDS_A_MONTH],
	[REPEAT_TYPES.Weeks, SECONDS_A_WEEK],
	[REPEAT_TYPES.Days, SECONDS_A_DAY],
	[REPEAT_TYPES.Hours, SECONDS_A_HOUR],
	[REPEAT_TYPES.Minutes, SECONDS_A_MINUTE],
]

/** The largest whole unit for an interval in seconds, e.g. 60 days → 2 months. */
export function parseRepeatAfter(seconds: number | null | undefined): RepeatAfter {
	const total = seconds ?? 0
	if (total <= 0) {
		return {type: REPEAT_TYPES.Hours, amount: 0}
	}
	for (const [type, size] of UNITS_LARGEST_FIRST) {
		if (total % size === 0) {
			return {type, amount: total / size}
		}
	}
	return {type: REPEAT_TYPES.Seconds, amount: total}
}

export function repeatAfterToSeconds(repeatAfter: RepeatAfter | number | null | undefined): number {
	if (typeof repeatAfter === 'number') {
		return repeatAfter
	}
	if (!repeatAfter?.amount) {
		return 0
	}
	return repeatAfter.amount * (SECONDS_PER_UNIT[repeatAfter.type] ?? 0)
}

// Only "every month" gets the api's calendar-month mode; longer month intervals repeat after 30-day blocks.
export function repeatModeFor(repeatAfter: RepeatAfter | null | undefined): IRepeatMode {
	return repeatAfter?.type === REPEAT_TYPES.Months && repeatAfter.amount === 1
		? TASK_REPEAT_MODES.REPEAT_MODE_MONTH
		: TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT
}
