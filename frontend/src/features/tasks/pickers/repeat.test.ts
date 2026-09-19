import {describe, expect, it} from 'vitest'

import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_MONTH, SECONDS_A_WEEK, SECONDS_A_YEAR} from '@/constants/date'
import {readRepeat} from '@/modules/task/describe'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'

import {noRepeat, presetRepeatSettings, REPEAT_PRESETS, repeatPresetFor, toRepeatSettings} from './repeat'

const {REPEAT_MODE_DEFAULT: DEFAULT, REPEAT_MODE_MONTH: MONTH, REPEAT_MODE_FROM_CURRENT_DATE: FROM_COMPLETION} = TASK_REPEAT_MODES

describe('toRepeatSettings', () => {
	it.each([
		[{type: 'days', amount: 1}, false, {repeat_after: SECONDS_A_DAY, repeat_mode: DEFAULT}],
		[{type: 'weeks', amount: 2}, false, {repeat_after: 2 * SECONDS_A_WEEK, repeat_mode: DEFAULT}],
		[{type: 'months', amount: 1}, false, {repeat_after: SECONDS_A_MONTH, repeat_mode: MONTH}],
		[{type: 'months', amount: 3}, false, {repeat_after: 3 * SECONDS_A_MONTH, repeat_mode: DEFAULT}],
		[{type: 'years', amount: 1}, false, {repeat_after: SECONDS_A_YEAR, repeat_mode: DEFAULT}],
		[{type: 'hours', amount: 6}, true, {repeat_after: 6 * SECONDS_A_HOUR, repeat_mode: FROM_COMPLETION}],
		// The monthly mode has no from-completion variant: it becomes a 30-day interval.
		[{type: 'months', amount: 1}, true, {repeat_after: SECONDS_A_MONTH, repeat_mode: FROM_COMPLETION}],
	] as const)('stores %o (from completion: %s)', (interval, fromCompletion, expected) => {
		expect(toRepeatSettings(interval, fromCompletion)).toEqual(expected)
	})

	it('stores no repeat for a missing or empty interval', () => {
		expect(toRepeatSettings(null, true)).toEqual(noRepeat())
		expect(toRepeatSettings({type: 'days', amount: 0}, false)).toEqual(noRepeat())
	})

	it('round-trips through readRepeat', () => {
		for (const interval of [...Object.values(REPEAT_PRESETS), {type: 'weeks', amount: 3} as const, {type: 'months', amount: 6} as const]) {
			for (const fromCompletion of [false, true]) {
				const settings = toRepeatSettings(interval, fromCompletion)
				expect(readRepeat(settings.repeat_after, settings.repeat_mode)).toEqual({interval, fromCompletion})
			}
		}
	})
})

describe('repeatPresetFor', () => {
	it('names the preset an interval matches', () => {
		expect(repeatPresetFor(null)).toBe('none')
		expect(repeatPresetFor({type: 'days', amount: 1})).toBe('daily')
		expect(repeatPresetFor({type: 'months', amount: 1})).toBe('monthly')
		expect(repeatPresetFor({type: 'weeks', amount: 2})).toBeNull()
	})
})

describe('presetRepeatSettings', () => {
	it('keeps the from-completion choice when switching presets', () => {
		const current = {repeat_after: SECONDS_A_DAY, repeat_mode: FROM_COMPLETION}
		expect(presetRepeatSettings('weekly', current)).toEqual({repeat_after: SECONDS_A_WEEK, repeat_mode: FROM_COMPLETION})
		expect(presetRepeatSettings('monthly', {repeat_after: SECONDS_A_DAY, repeat_mode: DEFAULT}))
			.toEqual({repeat_after: SECONDS_A_MONTH, repeat_mode: MONTH})
		expect(presetRepeatSettings('none', current)).toEqual(noRepeat())
	})
})
