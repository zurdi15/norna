import {describe, expect, it} from 'vitest'

import {
	MAX_RANGE_DAYS,
	formatKebabDate,
	matchRangePreset,
	normalizeRange,
	parseKebabDate,
	presetRange,
	rangeContains,
	rangeDayCount,
	rangeFromQuery,
	rangeToQuery,
	shiftRange,
} from './ganttRange'

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date)
// A Friday afternoon in September.
const now = new Date(2026, 8, 18, 15, 30)

describe('presetRange', () => {
	it('covers the whole current month', () => {
		expect(presetRange('thisMonth', now)).toEqual({from: day(2026, 9, 1), to: day(2026, 9, 30)})
	})

	it('looks three and six months ahead, keeping the past week in view', () => {
		expect(presetRange('next3Months', now)).toEqual({from: day(2026, 9, 11), to: day(2026, 12, 17)})
		expect(presetRange('next6Months', now)).toEqual({from: day(2026, 9, 11), to: day(2027, 3, 17)})
	})

	it('clamps month arithmetic to short months', () => {
		expect(presetRange('next3Months', new Date(2026, 10, 30)).to).toEqual(day(2027, 2, 27))
	})

	it('covers the whole year', () => {
		expect(presetRange('thisYear', now)).toEqual({from: day(2026, 1, 1), to: day(2026, 12, 31)})
	})
})

describe('matchRangePreset', () => {
	it('recognises a preset range and nothing else', () => {
		expect(matchRangePreset(presetRange('thisYear', now), now)).toBe('thisYear')
		expect(matchRangePreset({from: day(2026, 9, 2), to: day(2026, 9, 30)}, now)).toBeNull()
	})
})

describe('kebab dates', () => {
	it('round-trips local days', () => {
		expect(formatKebabDate(day(2026, 3, 5))).toBe('2026-03-05')
		expect(parseKebabDate('2026-03-05')).toEqual(day(2026, 3, 5))
		expect(parseKebabDate('2026-3-5')).toEqual(day(2026, 3, 5))
	})

	it('rejects anything that is not a real day', () => {
		expect(parseKebabDate('2026-02-31')).toBeNull()
		expect(parseKebabDate('2026-13-01')).toBeNull()
		expect(parseKebabDate('tomorrow')).toBeNull()
		expect(parseKebabDate(['2026-03-05'])).toBeNull()
		expect(parseKebabDate(undefined)).toBeNull()
	})
})

describe('url query', () => {
	it('reads a custom range', () => {
		expect(rangeFromQuery({dateFrom: '2024-01-01', dateTo: '2024-02-01'}, now))
			.toEqual({from: day(2024, 1, 1), to: day(2024, 2, 1)})
	})

	it('falls back to the default preset without a complete, valid range', () => {
		const fallback = presetRange('next3Months', now)
		expect(rangeFromQuery({}, now)).toEqual(fallback)
		expect(rangeFromQuery({dateFrom: '2024-01-01'}, now)).toEqual(fallback)
		expect(rangeFromQuery({dateFrom: '2024-01-01', dateTo: 'nope'}, now)).toEqual(fallback)
	})

	it('puts reversed ends in order and caps the length', () => {
		expect(rangeFromQuery({dateFrom: '2024-02-01', dateTo: '2024-01-01'}, now))
			.toEqual({from: day(2024, 1, 1), to: day(2024, 2, 1)})
		expect(rangeDayCount(rangeFromQuery({dateFrom: '2020-01-01', dateTo: '2030-01-01'}, now))).toBe(MAX_RANGE_DAYS)
	})

	it('leaves the default range out of the url and writes any other', () => {
		expect(rangeToQuery(presetRange('next3Months', now), now)).toEqual({dateFrom: undefined, dateTo: undefined})
		expect(rangeToQuery(presetRange('thisMonth', now), now)).toEqual({dateFrom: '2026-09-01', dateTo: '2026-09-30'})
	})
})

describe('normalizeRange', () => {
	it('drops the time of day', () => {
		expect(normalizeRange(new Date(2026, 8, 1, 14), new Date(2026, 8, 3, 9)))
			.toEqual({from: day(2026, 9, 1), to: day(2026, 9, 3)})
	})
})

describe('shiftRange', () => {
	it('steps whole-month ranges by months', () => {
		expect(shiftRange({from: day(2026, 9, 1), to: day(2026, 9, 30)}, 1))
			.toEqual({from: day(2026, 10, 1), to: day(2026, 10, 31)})
		expect(shiftRange({from: day(2026, 1, 1), to: day(2026, 3, 31)}, -1))
			.toEqual({from: day(2025, 10, 1), to: day(2025, 12, 31)})
	})

	it('steps other ranges by their length in days', () => {
		expect(shiftRange({from: day(2026, 9, 11), to: day(2026, 9, 20)}, 1))
			.toEqual({from: day(2026, 9, 21), to: day(2026, 9, 30)})
		expect(shiftRange({from: day(2026, 9, 11), to: day(2026, 9, 20)}, -1))
			.toEqual({from: day(2026, 9, 1), to: day(2026, 9, 10)})
	})
})

describe('rangeContains', () => {
	it('includes both ends, at any time of day', () => {
		const range = {from: day(2026, 9, 1), to: day(2026, 9, 30)}
		expect(rangeContains(range, new Date(2026, 8, 30, 23, 59))).toBe(true)
		expect(rangeContains(range, day(2026, 9, 1))).toBe(true)
		expect(rangeContains(range, day(2026, 10, 1))).toBe(false)
	})
})
