import {describe, expect, it} from 'vitest'

import {customRange, dayKey, entriesFilter, groupByDay, parseDayKey, presetRange, startOfWeek} from './ranges'

// Friday 18 September 2026, local time.
const now = new Date(2026, 8, 18, 15, 30)

describe('time tracking ranges', () => {
	it('starts the week on the user\'s day', () => {
		expect(dayKey(startOfWeek(now, 1))).toBe('2026-09-14')
		expect(dayKey(startOfWeek(now, 0))).toBe('2026-09-13')
		expect(dayKey(startOfWeek(now, 5))).toBe('2026-09-18')
	})

	it('builds the presets as whole days, the end excluded', () => {
		const days = (range: {from: Date, to: Date}) => [dayKey(range.from), dayKey(range.to)]

		expect(days(presetRange('thisWeek', now, 1))).toEqual(['2026-09-14', '2026-09-21'])
		expect(days(presetRange('lastWeek', now, 1))).toEqual(['2026-09-07', '2026-09-14'])
		expect(days(presetRange('thisMonth', now, 1))).toEqual(['2026-09-01', '2026-10-01'])
		expect(days(customRange(new Date(2026, 8, 10), new Date(2026, 8, 3)))).toEqual(['2026-09-03', '2026-09-11'])
	})

	it('reads days from the url and refuses anything else', () => {
		expect(parseDayKey('2026-09-03')?.getDate()).toBe(3)
		expect(parseDayKey('2026-02-30')).toBeNull()
		expect(parseDayKey('now/w')).toBeNull()
		expect(parseDayKey(undefined)).toBeNull()
	})

	it('filters the user\'s entries in the range and projects', () => {
		const range = presetRange('thisWeek', now, 1)

		expect(entriesFilter({range, userId: 4})).toBe('user_id = 4 && start_time >= 2026-09-14 && start_time < 2026-09-21')
		expect(entriesFilter({range, userId: 4, projectIds: [5, 9]})).toBe('user_id = 4 && start_time >= 2026-09-14 && start_time < 2026-09-21 && project_id in 5, 9')
	})

	it('groups entries by the day they started, newest first, with the day\'s total', () => {
		const at = (day: number, hour: number) => new Date(2026, 8, day, hour).toISOString()
		const entries = [
			{id: 1, start_time: at(17, 9), end_time: at(17, 10)},
			{id: 2, start_time: at(18, 8), end_time: at(18, 9)},
			{id: 3, start_time: at(18, 14), end_time: null},
			{id: 4, start_time: at(17, 13), end_time: at(17, 15)},
		]

		const groups = groupByDay(entries, now)

		expect(groups.map(group => [group.key, group.entries.map(entry => entry.id), group.seconds])).toEqual([
			['2026-09-18', [3, 2], 3600 + 5400],
			['2026-09-17', [4, 1], 3 * 3600],
		])
	})
})
