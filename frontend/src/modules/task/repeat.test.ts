import {describe, expect, it} from 'vitest'

import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_MONTH, SECONDS_A_WEEK, SECONDS_A_YEAR} from '@/constants/date'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'

import {parseRepeatAfter, repeatAfterToSeconds, repeatModeFor} from './repeat'

describe('repeatAfterToSeconds', () => {
	it.each([
		['hours', 3, 3 * SECONDS_A_HOUR],
		['days', 2, 2 * SECONDS_A_DAY],
		['weeks', 1, SECONDS_A_WEEK],
		['minutes', 90, 90 * 60],
	] as const)('converts %s', (type, amount, seconds) => {
		expect(repeatAfterToSeconds({type, amount})).toBe(seconds)
	})

	// Regression: months with an amount above one and every years interval used to become 0.
	it.each([
		['months', 2, 2 * SECONDS_A_MONTH],
		['months', 6, 6 * SECONDS_A_MONTH],
		['years', 1, SECONDS_A_YEAR],
		['years', 2, 2 * SECONDS_A_YEAR],
	] as const)('converts %s × %i instead of dropping the interval', (type, amount, seconds) => {
		expect(repeatAfterToSeconds({type, amount})).toBe(seconds)
	})

	it('passes raw seconds through', () => {
		expect(repeatAfterToSeconds(3600)).toBe(3600)
	})

	it('treats a missing or empty interval as no repeat', () => {
		expect(repeatAfterToSeconds(undefined)).toBe(0)
		expect(repeatAfterToSeconds(null)).toBe(0)
		expect(repeatAfterToSeconds({type: 'days', amount: 0})).toBe(0)
	})
})

describe('parseRepeatAfter', () => {
	it('picks the largest whole unit', () => {
		expect(parseRepeatAfter(2 * SECONDS_A_WEEK)).toEqual({type: 'weeks', amount: 2})
		expect(parseRepeatAfter(3 * SECONDS_A_DAY)).toEqual({type: 'days', amount: 3})
		expect(parseRepeatAfter(5 * SECONDS_A_HOUR)).toEqual({type: 'hours', amount: 5})
		expect(parseRepeatAfter(90 * 60)).toEqual({type: 'minutes', amount: 90})
	})

	it('round-trips through repeatAfterToSeconds', () => {
		for (const seconds of [SECONDS_A_HOUR, 4 * SECONDS_A_DAY, 3 * SECONDS_A_WEEK, 2 * SECONDS_A_MONTH, SECONDS_A_YEAR]) {
			expect(repeatAfterToSeconds(parseRepeatAfter(seconds))).toBe(seconds)
		}
	})
})

describe('repeatModeFor', () => {
	it('uses the monthly mode for every month', () => {
		expect(repeatModeFor({type: 'months', amount: 1})).toBe(TASK_REPEAT_MODES.REPEAT_MODE_MONTH)
	})

	it('keeps the default mode for other intervals', () => {
		expect(repeatModeFor({type: 'months', amount: 2})).toBe(TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT)
		expect(repeatModeFor({type: 'weeks', amount: 1})).toBe(TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT)
		expect(repeatModeFor(null)).toBe(TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT)
	})
})
