import {daysBetween} from '@/composables/useGanttBar'
import {addDays} from '@/helpers/time/dateMath'

import type {GanttRange} from './ganttRange'

export type GanttScale = 'day' | 'week'

export const GANTT_SCALES: readonly GanttScale[] = ['day', 'week']

// Narrowest day column per scale; short ranges stretch to fill the width instead.
export const MIN_DAY_WIDTH: Record<GanttScale, number> = {
	day: 32,
	week: 12,
}

export interface TimelineDay {
	index: number
	date: Date
	weekend: boolean
	weekStart: boolean
	monthStart: boolean
}

export interface TimelineSegment {
	/** Index of the first day. */
	start: number
	days: number
	date: Date
}

export function timelineDays(range: GanttRange, weekStartsOn: number): TimelineDay[] {
	const count = daysBetween(range.from, range.to) + 1
	return Array.from({length: Math.max(count, 0)}, (_, index) => {
		const date = addDays(range.from, index)
		const weekday = date.getDay()
		return {
			index,
			date,
			weekend: weekday === 0 || weekday === 6,
			weekStart: weekday === weekStartsOn,
			monthStart: date.getDate() === 1,
		}
	})
}

function segments(days: TimelineDay[], startsSegment: (day: TimelineDay) => boolean): TimelineSegment[] {
	const result: TimelineSegment[] = []
	for (const day of days) {
		const last = result.at(-1)
		if (!last || startsSegment(day)) {
			result.push({start: day.index, days: 1, date: day.date})
		} else {
			last.days++
		}
	}
	return result
}

export function timelineMonths(days: TimelineDay[]): TimelineSegment[] {
	return segments(days, day => day.monthStart)
}

export function timelineWeeks(days: TimelineDay[]): TimelineSegment[] {
	return segments(days, day => day.weekStart)
}

/** Day columns fill the visible width, but never get narrower than the scale allows. */
export function dayWidthFor(scale: GanttScale, availableWidth: number, dayCount: number): number {
	const fill = dayCount > 0 ? availableWidth / dayCount : 0
	return Math.max(MIN_DAY_WIDTH[scale], Math.floor(fill * 100) / 100)
}

/** Where a moment sits on the timeline, in days from the range start (fractions for the time of day). */
export function dayOffset(range: GanttRange, date: Date): number {
	const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const dayLength = addDays(midnight, 1).getTime() - midnight.getTime()
	return daysBetween(range.from, date) + (date.getTime() - midnight.getTime()) / dayLength
}
