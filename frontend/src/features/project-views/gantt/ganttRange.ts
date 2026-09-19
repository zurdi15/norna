import {daysBetween} from '@/composables/useGanttBar'
import {addDays, startOfDay} from '@/helpers/time/dateMath'

/** The days on the timeline, both ends included and at 00:00 local time. */
export interface GanttRange {
	from: Date
	to: Date
}

export const GANTT_RANGE_PRESETS = ['thisMonth', 'next3Months', 'next6Months', 'thisYear'] as const
export type GanttRangePreset = typeof GANTT_RANGE_PRESETS[number]

export const DEFAULT_RANGE_PRESET: GanttRangePreset = 'next3Months'

// The "next months" ranges keep the past week in view, where late tasks still are.
const LOOK_BACK_DAYS = 7

// Longer ranges would render thousands of day columns.
export const MAX_RANGE_DAYS = 731

function addMonths(date: Date, months: number): Date {
	const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
	target.setDate(Math.min(date.getDate(), lastDay))
	return target
}

export function presetRange(preset: GanttRangePreset, now: Date): GanttRange {
	const today = startOfDay(now)
	const year = today.getFullYear()
	const month = today.getMonth()
	switch (preset) {
		case 'thisMonth':
			return {from: new Date(year, month, 1), to: new Date(year, month + 1, 0)}
		case 'next3Months':
			return {from: addDays(today, -LOOK_BACK_DAYS), to: addDays(addMonths(today, 3), -1)}
		case 'next6Months':
			return {from: addDays(today, -LOOK_BACK_DAYS), to: addDays(addMonths(today, 6), -1)}
		case 'thisYear':
			return {from: new Date(year, 0, 1), to: new Date(year, 11, 31)}
	}
}

export function isSameRange(a: GanttRange, b: GanttRange): boolean {
	return daysBetween(a.from, b.from) === 0 && daysBetween(a.to, b.to) === 0
}

export function matchRangePreset(range: GanttRange, now: Date): GanttRangePreset | null {
	return GANTT_RANGE_PRESETS.find(preset => isSameRange(range, presetRange(preset, now))) ?? null
}

export function rangeDayCount(range: GanttRange): number {
	return daysBetween(range.from, range.to) + 1
}

export function rangeContains(range: GanttRange, date: Date): boolean {
	return daysBetween(range.from, date) >= 0 && daysBetween(date, range.to) >= 0
}

/** Keeps a range in order, whole days and at most MAX_RANGE_DAYS long. */
export function normalizeRange(from: Date, to: Date): GanttRange {
	let first = startOfDay(from)
	let last = startOfDay(to)
	if (last < first) {
		[first, last] = [last, first]
	}
	if (daysBetween(first, last) >= MAX_RANGE_DAYS) {
		last = addDays(first, MAX_RANGE_DAYS - 1)
	}
	return {from: first, to: last}
}

function pad(value: number): string {
	return String(value).padStart(2, '0')
}

/** YYYY-MM-DD in local time, the format of the url and of the api's date filters. */
export function formatKebabDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseKebabDate(value: unknown): Date | null {
	if (typeof value !== 'string') {
		return null
	}
	const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim())
	if (!match) {
		return null
	}
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
	const date = new Date(year, month - 1, day)
	// Rejects days that roll over, like 2026-02-31.
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export interface GanttRangeQuery {
	dateFrom?: string
	dateTo?: string
}

/** The range a url asks for; without a valid one, the default preset. */
export function rangeFromQuery(query: {dateFrom?: unknown, dateTo?: unknown}, now: Date): GanttRange {
	const from = parseKebabDate(query.dateFrom)
	const to = parseKebabDate(query.dateTo)
	return from && to ? normalizeRange(from, to) : presetRange(DEFAULT_RANGE_PRESET, now)
}

/** The url keys of a range; the default preset leaves them out so a plain link stays relative to today. */
export function rangeToQuery(range: GanttRange, now: Date): GanttRangeQuery {
	if (isSameRange(range, presetRange(DEFAULT_RANGE_PRESET, now))) {
		return {dateFrom: undefined, dateTo: undefined}
	}
	return {dateFrom: formatKebabDate(range.from), dateTo: formatKebabDate(range.to)}
}

function isWholeMonths(range: GanttRange): boolean {
	return range.from.getDate() === 1 && addDays(range.to, 1).getDate() === 1
}

/**
 * The previous or next range of the same length. Ranges of whole months step by months,
 * so "this month" goes to the whole next month rather than 30 days on.
 */
export function shiftRange(range: GanttRange, direction: -1 | 1): GanttRange {
	if (isWholeMonths(range)) {
		const months = (range.to.getFullYear() - range.from.getFullYear()) * 12 + range.to.getMonth() - range.from.getMonth() + 1
		const from = new Date(range.from.getFullYear(), range.from.getMonth() + direction * months, 1)
		return {from, to: new Date(from.getFullYear(), from.getMonth() + months, 0)}
	}
	const days = rangeDayCount(range) * direction
	return {from: addDays(range.from, days), to: addDays(range.to, days)}
}
