import {describe, expect, it} from 'vitest'

import {
	defaultTimeOfDay,
	formatTimeOfDay,
	parseTimeOfDay,
	stepTimeOfDay,
	withTimeOfDay,
} from './timeOfDay'

describe('parseTimeOfDay', () => {
	it.each([
		['14:30', 14, 30],
		['14.30', 14, 30],
		['14,30', 14, 30],
		['14h30', 14, 30],
		['1430', 14, 30],
		['930', 9, 30],
		['9', 9, 0],
		['0', 0, 0],
		['21h', 21, 0],
		[' 07:05 ', 7, 5],
	])('reads the 24-hour form %s', (text, hours, minutes) => {
		expect(parseTimeOfDay(text)).toEqual({hours, minutes})
	})

	it.each([
		['9am', 9, 0],
		['9 PM', 21, 0],
		['9:30 pm', 21, 30],
		['12am', 0, 0],
		['12 pm', 12, 0],
		['9:30 p. m.', 21, 30],
		['9:30 a. m.', 9, 30],
	])('reads the 12-hour form %s', (text, hours, minutes) => {
		expect(parseTimeOfDay(text)).toEqual({hours, minutes})
	})

	it.each(['', 'soon', '24:00', '9:60', '13pm', '0am', '9:3', '12345', null, undefined])('rejects %s', text => {
		expect(parseTimeOfDay(text)).toBeNull()
	})
})

describe('formatTimeOfDay', () => {
	it('pads the hour on a 24-hour clock', () => {
		expect(formatTimeOfDay({hours: 9, minutes: 5}, {locale: 'es-ES', hour12: false})).toBe('09:05')
		expect(formatTimeOfDay({hours: 21, minutes: 0}, {locale: 'en', hour12: false})).toBe('21:00')
	})

	it('adds the meridiem on a 12-hour clock and round-trips through the parser', () => {
		const text = formatTimeOfDay({hours: 21, minutes: 30}, {locale: 'en', hour12: true})
		expect(text).toMatch(/^9:30\sPM$/)
		expect(parseTimeOfDay(text)).toEqual({hours: 21, minutes: 30})
		const spanish = formatTimeOfDay({hours: 9, minutes: 30}, {locale: 'es-ES', hour12: true})
		expect(parseTimeOfDay(spanish)).toEqual({hours: 9, minutes: 30})
	})

	it('reads the time of a date', () => {
		expect(formatTimeOfDay(new Date(2026, 8, 18, 18, 45), {locale: 'en', hour12: false})).toBe('18:45')
	})
})

describe('stepTimeOfDay', () => {
	it('wraps around midnight both ways', () => {
		expect(stepTimeOfDay({hours: 23, minutes: 50}, 15)).toEqual({hours: 0, minutes: 5})
		expect(stepTimeOfDay({hours: 0, minutes: 10}, -15)).toEqual({hours: 23, minutes: 55})
		expect(stepTimeOfDay({hours: 9, minutes: 0}, -60)).toEqual({hours: 8, minutes: 0})
	})
})

describe('withTimeOfDay', () => {
	it('keeps the day and drops seconds', () => {
		const result = withTimeOfDay(new Date(2026, 8, 18, 3, 4, 5, 6), {hours: 10, minutes: 15})
		expect(result).toEqual(new Date(2026, 8, 18, 10, 15))
	})
})

describe('defaultTimeOfDay', () => {
	const now = new Date(2026, 8, 18, 10, 20)

	it('uses the configured default due time', () => {
		expect(defaultTimeOfDay(new Date(2026, 8, 20), now, '14:30')).toEqual({hours: 14, minutes: 30})
	})

	it('picks the next sensible hour today and the morning on other days', () => {
		expect(defaultTimeOfDay(new Date(2026, 8, 18), now)).toEqual({hours: 12, minutes: 0})
		expect(defaultTimeOfDay(new Date(2026, 8, 19), now, '')).toEqual({hours: 9, minutes: 0})
	})

	it('ignores a malformed default', () => {
		expect(defaultTimeOfDay(new Date(2026, 8, 19), now, '25:99')).toEqual({hours: 9, minutes: 0})
	})
})
