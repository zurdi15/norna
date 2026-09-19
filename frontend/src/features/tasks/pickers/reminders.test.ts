import {describe, expect, it} from 'vitest'

import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_MINUTE, SECONDS_A_WEEK} from '@/constants/date'
import {NO_DATE} from '@/modules/task/task'

import {
	absoluteReminder,
	relativeReminder,
	relativeReminderForm,
	reminderFromForm,
	reminderPresetGroups,
	removeReminder,
	replaceReminder,
	sameReminder,
	toggleReminder,
} from './reminders'

const due = new Date(2026, 8, 19, 10, 0)
const start = new Date(2026, 8, 15, 9, 0)

describe('reminderPresetGroups', () => {
	it('offers presets only for the dates the task has', () => {
		const groups = reminderPresetGroups({due_date: due.toISOString(), start_date: NO_DATE, end_date: null})
		expect(groups.map(group => group.relativeTo)).toEqual(['due_date'])
		expect(groups[0]!.date).toEqual(due)
		expect(groups[0]!.periods).toContain(-SECONDS_A_HOUR)
	})

	it('keeps due, start, end order and is empty without dates', () => {
		expect(reminderPresetGroups({end_date: due, start_date: start}).map(group => group.relativeTo)).toEqual(['start_date', 'end_date'])
		expect(reminderPresetGroups({})).toEqual([])
	})
})

describe('sameReminder', () => {
	it('compares relative reminders by reference and offset, ignoring the resolved date', () => {
		expect(sameReminder(
			{relative_to: 'due_date', relative_period: -60, reminder: '2026-09-19T08:59:00Z'},
			{relative_to: 'due_date', relative_period: -60},
		)).toBe(true)
		expect(sameReminder(relativeReminder('due_date', 0), relativeReminder('start_date', 0))).toBe(false)
	})

	it('compares absolute reminders by instant', () => {
		expect(sameReminder({reminder: '2026-09-19T10:00:00Z'}, {reminder: '2026-09-19T10:00:00.000Z'})).toBe(true)
		expect(sameReminder({reminder: NO_DATE}, {reminder: NO_DATE})).toBe(false)
		expect(sameReminder({reminder: due.toISOString()}, relativeReminder('due_date', 0))).toBe(false)
	})
})

describe('toggleReminder', () => {
	it('adds a missing reminder and removes a present one without touching the input', () => {
		const list = [absoluteReminder(due)]
		const added = toggleReminder(list, relativeReminder('due_date', -SECONDS_A_DAY))
		expect(added).toHaveLength(2)
		expect(list).toHaveLength(1)
		expect(toggleReminder(added, relativeReminder('due_date', -SECONDS_A_DAY))).toEqual(list)
	})
})

describe('replaceReminder', () => {
	const list = [relativeReminder('due_date', 0), relativeReminder('due_date', -SECONDS_A_HOUR)]

	it('appends a new reminder', () => {
		expect(replaceReminder(list, null, absoluteReminder(due))).toEqual([...list, absoluteReminder(due)])
	})

	it('replaces in place', () => {
		const next = replaceReminder(list, 1, relativeReminder('due_date', -SECONDS_A_DAY))
		expect(next).toEqual([list[0], relativeReminder('due_date', -SECONDS_A_DAY)])
	})

	it('merges an edit that lands on another reminder, and ignores a new duplicate', () => {
		expect(replaceReminder(list, 1, relativeReminder('due_date', 0))).toEqual([list[0]])
		expect(replaceReminder(list, null, relativeReminder('due_date', 0))).toEqual(list)
	})

	it('removes by index', () => {
		expect(removeReminder(list, 0)).toEqual([list[1]])
	})
})

describe('relative reminder form', () => {
	it('defaults to one hour before', () => {
		expect(relativeReminderForm(null, 'start_date')).toEqual({amount: 1, unit: 'hours', direction: 'before', relativeTo: 'start_date'})
	})

	it.each([
		[-15 * SECONDS_A_MINUTE, {amount: 15, unit: 'minutes', direction: 'before'}],
		[-2 * SECONDS_A_WEEK, {amount: 2, unit: 'weeks', direction: 'before'}],
		[3 * SECONDS_A_DAY, {amount: 3, unit: 'days', direction: 'after'}],
		[0, {amount: 0, unit: 'hours', direction: 'before'}],
	] as const)('round-trips %i seconds', (seconds, expected) => {
		const form = relativeReminderForm(relativeReminder('end_date', seconds), 'due_date')
		expect(form).toEqual({...expected, relativeTo: 'end_date'})
		expect(reminderFromForm(form)).toEqual(relativeReminder('end_date', seconds))
	})

	it('clamps negative or fractional amounts', () => {
		expect(reminderFromForm({amount: -3, unit: 'hours', direction: 'after', relativeTo: 'due_date'}))
			.toEqual({relative_to: 'due_date', relative_period: 0})
		expect(reminderFromForm({amount: 1.6, unit: 'hours', direction: 'before', relativeTo: 'due_date'}))
			.toEqual({relative_to: 'due_date', relative_period: -2 * SECONDS_A_HOUR})
		expect(Object.is(reminderFromForm({amount: 0, unit: 'days', direction: 'before', relativeTo: 'due_date'}).relative_period, -0)).toBe(false)
	})
})
