import {describe, expect, it} from 'vitest'

import type {Task} from '@/client/generated'
import {NO_DATE} from '@/modules/task/task'

import {
	OPEN_END_DAYS,
	barEditPatch,
	barIntersects,
	drawnSpanPatch,
	previousDates,
	taskBar,
	type NewDateTime,
} from './ganttBars'

const day = (month: number, date: number) => new Date(2026, month - 1, date)
const at = (month: number, date: number, hours = 9, minutes = 0) => new Date(2026, month - 1, date, hours, minutes)
const iso = (date: Date) => date.toISOString()

function task(dates: {start?: Date, end?: Date, due?: Date}): Task {
	return {
		id: 1,
		title: 'Task',
		start_date: dates.start ? iso(dates.start) : NO_DATE,
		end_date: dates.end ? iso(dates.end) : NO_DATE,
		due_date: dates.due ? iso(dates.due) : NO_DATE,
	}
}

// New dates get 09:00 here, like the pickers without a user default.
const at9: NewDateTime = date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9)

describe('taskBar', () => {
	it('runs from the start day to the end day', () => {
		expect(taskBar(task({start: at(9, 10), end: at(9, 14, 17)})))
			.toEqual({start: day(9, 10), end: day(9, 14), type: 'both', derived: false})
	})

	it('ends on the due date when there is no end date', () => {
		expect(taskBar(task({start: at(9, 10), due: at(9, 12)}))).toMatchObject({end: day(9, 12), type: 'both'})
	})

	it('closes an end date at midnight on the day before, but keeps a due date at midnight', () => {
		expect(taskBar(task({start: at(9, 10), end: at(9, 14, 0)}))!.end).toEqual(day(9, 13))
		expect(taskBar(task({start: at(9, 10), due: at(9, 14, 0)}))!.end).toEqual(day(9, 14))
	})

	it('keeps a bar at least one day long', () => {
		expect(taskBar(task({start: at(9, 10, 12), end: at(9, 10, 0)}))).toMatchObject({start: day(9, 10), end: day(9, 10)})
	})

	it('fades out after a start without an end', () => {
		expect(taskBar(task({start: at(9, 10)})))
			.toEqual({start: day(9, 10), end: day(9, 10 + OPEN_END_DAYS - 1), type: 'startOnly', derived: false})
	})

	it('fades in before an end without a start, from a due date too', () => {
		expect(taskBar(task({due: at(9, 20)})))
			.toEqual({start: day(9, 20 - OPEN_END_DAYS + 1), end: day(9, 20), type: 'endOnly', derived: false})
	})

	it('spans the subtasks of a dateless parent, marked as derived', () => {
		expect(taskBar(task({}), {start: at(9, 1), end: at(9, 5)}))
			.toEqual({start: day(9, 1), end: day(9, 5), type: 'both', derived: true})
		expect(taskBar(task({}))).toBeNull()
		expect(taskBar(task({}), {start: null, end: null})).toBeNull()
	})
})

describe('barIntersects', () => {
	const range = {from: day(9, 10), to: day(9, 20)}

	it('is true for any overlap, touching ends included', () => {
		expect(barIntersects({start: day(9, 1), end: day(9, 10)}, range)).toBe(true)
		expect(barIntersects({start: day(9, 20), end: day(9, 25)}, range)).toBe(true)
		expect(barIntersects({start: day(9, 1), end: day(9, 30)}, range)).toBe(true)
	})

	it('is false for bars fully outside', () => {
		expect(barIntersects({start: day(9, 1), end: day(9, 9)}, range)).toBe(false)
		expect(barIntersects({start: day(9, 21), end: day(9, 25)}, range)).toBe(false)
	})
})

describe('barEditPatch', () => {
	it('moves both dates by whole days and keeps their times', () => {
		const dated = task({start: at(9, 10, 8, 30), end: at(9, 14, 17)})
		expect(barEditPatch(dated, taskBar(dated)!, {start: 2, end: 2}, at9))
			.toEqual({start_date: at(9, 12, 8, 30), end_date: at(9, 16, 17)})
	})

	it('only writes the edge that changed', () => {
		const dated = task({start: at(9, 10), end: at(9, 14)})
		expect(barEditPatch(dated, taskBar(dated)!, {start: 0, end: 3}, at9)).toEqual({end_date: at(9, 17)})
	})

	it('edits the due date when it is the end of the bar', () => {
		const dated = task({start: at(9, 10), due: at(9, 14, 18)})
		expect(barEditPatch(dated, taskBar(dated)!, {start: -1, end: -1}, at9))
			.toEqual({start_date: at(9, 9), due_date: at(9, 13, 18)})
	})

	it('moves only the known date of an open-ended bar', () => {
		const startOnly = task({start: at(9, 10)})
		expect(barEditPatch(startOnly, taskBar(startOnly)!, {start: 1, end: 1}, at9)).toEqual({start_date: at(9, 11)})
		const dueOnly = task({due: at(9, 20, 16)})
		expect(barEditPatch(dueOnly, taskBar(dueOnly)!, {start: -2, end: -2}, at9)).toEqual({due_date: at(9, 18, 16)})
	})

	it('gives an open-ended bar its missing date when that side is dragged', () => {
		const dueOnly = task({due: at(9, 20, 16)})
		const bar = taskBar(dueOnly)!
		expect(barEditPatch(dueOnly, bar, {start: -2, end: 0}, at9)).toEqual({start_date: at9(day(9, 14))})

		const startOnly = task({start: at(9, 10)})
		expect(barEditPatch(startOnly, taskBar(startOnly)!, {start: 0, end: 1}, at9))
			.toEqual({end_date: at9(day(9, 15))})
	})

	it('never leaves the end before the start on the same day', () => {
		const dated = task({start: at(9, 10, 17), end: at(9, 12, 9)})
		expect(barEditPatch(dated, taskBar(dated)!, {start: 0, end: -2}, at9))
			.toEqual({end_date: at(9, 10, 17)})
	})

	it('does not edit bars borrowed from subtasks, nor no-op edits', () => {
		const parent = task({})
		const derived = taskBar(parent, {start: at(9, 1), end: at(9, 5)})!
		expect(barEditPatch(parent, derived, {start: 1, end: 1}, at9)).toBeNull()

		const dated = task({start: at(9, 10), end: at(9, 14)})
		expect(barEditPatch(dated, taskBar(dated)!, {start: 0, end: 0}, at9)).toBeNull()
	})
})

describe('drawnSpanPatch', () => {
	it('gives both new dates the time a picked day gets', () => {
		expect(drawnSpanPatch({start: day(9, 3), end: day(9, 6)}, at9)).toEqual({start_date: at(9, 3), end_date: at(9, 6)})
	})
})

describe('previousDates', () => {
	it('returns the dates a patch replaces, null for missing ones', () => {
		const dueOnly = task({due: at(9, 20)})
		expect(previousDates(dueOnly, {start_date: at(9, 14), due_date: at(9, 21)}))
			.toEqual({start_date: null, due_date: at(9, 20)})
	})
})
