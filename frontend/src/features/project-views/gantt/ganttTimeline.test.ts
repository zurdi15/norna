import {describe, expect, it} from 'vitest'

import {dayOffset, dayWidthFor, timelineDays, timelineMonths, timelineWeeks} from './ganttTimeline'

const day = (month: number, date: number) => new Date(2026, month - 1, date)
const range = {from: day(9, 28), to: day(10, 6)}

describe('timelineDays', () => {
	it('lists every day with weekends, week and month starts', () => {
		const days = timelineDays(range, 1)
		expect(days).toHaveLength(9)
		expect(days.filter(d => d.weekend).map(d => d.date.getDate())).toEqual([3, 4])
		expect(days.filter(d => d.weekStart).map(d => d.date.getDate())).toEqual([28, 5])
		expect(days.filter(d => d.monthStart).map(d => d.index)).toEqual([3])
	})

	it('starts weeks on the user\'s day', () => {
		expect(timelineDays(range, 0).filter(d => d.weekStart).map(d => d.date.getDate())).toEqual([4])
	})
})

describe('segments', () => {
	it('groups days into months and weeks, partial ones at the ends', () => {
		const days = timelineDays(range, 1)
		expect(timelineMonths(days).map(({start, days: count}) => [start, count])).toEqual([[0, 3], [3, 6]])
		expect(timelineWeeks(days).map(({start, days: count}) => [start, count])).toEqual([[0, 7], [7, 2]])
	})
})

describe('dayWidthFor', () => {
	it('fills the width for short ranges and keeps the minimum for long ones', () => {
		expect(dayWidthFor('day', 900, 30)).toBe(32)
		expect(dayWidthFor('day', 900, 10)).toBe(90)
		expect(dayWidthFor('week', 900, 180)).toBe(12)
		expect(dayWidthFor('week', 900, 0)).toBe(12)
	})
})

describe('dayOffset', () => {
	it('places a moment within its day', () => {
		expect(dayOffset(range, new Date(2026, 8, 29, 12))).toBe(1.5)
		expect(dayOffset(range, day(9, 28))).toBe(0)
	})
})
