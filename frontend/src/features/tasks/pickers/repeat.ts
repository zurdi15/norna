import {readRepeat, type RepeatSettings} from '@/modules/task/describe'
import {repeatAfterToSeconds, repeatModeFor} from '@/modules/task/repeat'
import {REPEAT_TYPES, type IRepeatAfter, type IRepeatType} from '@/types/IRepeatAfter'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'

// No "weekdays": the api repeats by a fixed interval only.
export const REPEAT_PRESETS = {
	daily: {type: REPEAT_TYPES.Days, amount: 1},
	weekly: {type: REPEAT_TYPES.Weeks, amount: 1},
	monthly: {type: REPEAT_TYPES.Months, amount: 1},
	yearly: {type: REPEAT_TYPES.Years, amount: 1},
} as const satisfies Record<string, IRepeatAfter>

export type RepeatPresetKey = 'none' | keyof typeof REPEAT_PRESETS

export const CUSTOM_REPEAT_UNITS: readonly IRepeatType[] = [
	REPEAT_TYPES.Hours,
	REPEAT_TYPES.Days,
	REPEAT_TYPES.Weeks,
	REPEAT_TYPES.Months,
	REPEAT_TYPES.Years,
]

export const DEFAULT_CUSTOM_REPEAT: IRepeatAfter = {type: REPEAT_TYPES.Weeks, amount: 2}

export function noRepeat(): RepeatSettings {
	return {repeat_after: 0, repeat_mode: TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT}
}

/**
 * What the api stores for an interval. "Every month" gets the calendar-month mode unless it
 * counts from completion, which the api only offers on a fixed interval (30 days).
 */
export function toRepeatSettings(interval: IRepeatAfter | null, fromCompletion: boolean): RepeatSettings {
	const seconds = repeatAfterToSeconds(interval)
	if (!interval || seconds <= 0) {
		return noRepeat()
	}
	return {
		repeat_after: seconds,
		repeat_mode: fromCompletion ? TASK_REPEAT_MODES.REPEAT_MODE_FROM_CURRENT_DATE : repeatModeFor(interval),
	}
}

export function repeatPresetFor(interval: IRepeatAfter | null): RepeatPresetKey | null {
	if (!interval) {
		return 'none'
	}
	const match = (Object.keys(REPEAT_PRESETS) as (keyof typeof REPEAT_PRESETS)[])
		.find(key => REPEAT_PRESETS[key].type === interval.type && REPEAT_PRESETS[key].amount === interval.amount)
	return match ?? null
}

export function presetRepeatSettings(key: RepeatPresetKey, current: RepeatSettings): RepeatSettings {
	if (key === 'none') {
		return noRepeat()
	}
	return toRepeatSettings(REPEAT_PRESETS[key], readRepeat(current.repeat_after, current.repeat_mode).fromCompletion)
}
