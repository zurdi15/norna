import type {TimeEntry} from '@/client/generated'
import {addDays, startOfDay} from '@/helpers/time/dateMath'

import {totalSeconds} from './duration'

export const RANGE_PRESETS = ['thisWeek', 'lastWeek', 'thisMonth'] as const
export type RangePreset = typeof RANGE_PRESETS[number]

/** Whole local days: from the start of the first to the start of the day after the last. */
export interface DayRange {
	from: Date
	to: Date
}

/** weekStart: 0 = Sunday … 6 = Saturday, the user's setting. */
export function startOfWeek(date: Date, weekStart: number): Date {
	const day = startOfDay(date)
	return addDays(day, -((day.getDay() - weekStart + 7) % 7))
}

export function presetRange(preset: RangePreset, now: Date, weekStart: number): DayRange {
	switch (preset) {
		case 'thisWeek': {
			const from = startOfWeek(now, weekStart)
			return {from, to: addDays(from, 7)}
		}
		case 'lastWeek': {
			const to = startOfWeek(now, weekStart)
			return {from: addDays(to, -7), to}
		}
		case 'thisMonth':
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
			}
	}
}

/** Both days count, in whichever order they were picked. */
export function customRange(first: Date, last: Date): DayRange {
	const [from, to] = first.getTime() <= last.getTime() ? [first, last] : [last, first]
	return {from: startOfDay(from), to: addDays(startOfDay(to), 1)}
}

/** A local day as "2026-09-18": the url form, and a date the filter grammar reads without a ':'. */
export function dayKey(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayKey(value: unknown): Date | null {
	const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
	if (!match) {
		return null
	}
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
	return date.getDate() === Number(match[3]) ? date : null
}

/** The user's own entries that started in the range, optionally only in some projects. */
export function entriesFilter({range, userId, projectIds = []}: {
	range: DayRange
	userId: number
	projectIds?: readonly number[]
}): string {
	const parts = [
		`user_id = ${userId}`,
		`start_time >= ${dayKey(range.from)}`,
		`start_time < ${dayKey(range.to)}`,
	]
	if (projectIds.length > 0) {
		// Also matches entries on the tasks of these projects.
		parts.push(`project_id in ${projectIds.join(', ')}`)
	}
	return parts.join(' && ')
}

export interface DayGroup<T> {
	key: string
	day: Date
	entries: T[]
	seconds: number
}

const startOf = (entry: Pick<TimeEntry, 'start_time'>) => entry.start_time ? new Date(entry.start_time).getTime() : 0

/** Newest day first, and the newest entry first within a day. */
export function groupByDay<T extends Pick<TimeEntry, 'start_time' | 'end_time'>>(entries: readonly T[], now: Date): DayGroup<T>[] {
	const groups = new Map<string, DayGroup<T>>()
	for (const entry of [...entries].sort((a, b) => startOf(b) - startOf(a))) {
		const day = startOfDay(new Date(startOf(entry)))
		const key = dayKey(day)
		const group = groups.get(key) ?? {key, day, entries: [], seconds: 0}
		group.entries.push(entry)
		groups.set(key, group)
	}
	return [...groups.values()].map(group => ({...group, seconds: totalSeconds(group.entries, now)}))
}
