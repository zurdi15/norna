import type {Task} from '@/client/generated'
import type {TaskPatch} from '@/client/queries/tasks'
import {
	daysBetween,
	type GanttBarDateType,
	type GanttBarEdit,
	type GanttDaySpan,
} from '@/composables/useGanttBar'
import {addDays, startOfDay} from '@/helpers/time/dateMath'
import {getTaskDate} from '@/modules/task/task'

import type {GanttRange} from './ganttRange'

// An open-ended bar fades out over this many days on the side without a date.
export const OPEN_END_DAYS = 5

export interface GanttBar extends GanttDaySpan {
	type: GanttBarDateType
	/** A dateless parent spanning its subtasks: shown, but not editable. */
	derived: boolean
}

type EndField = 'end_date' | 'due_date'

interface TaskDates {
	start: Date | null
	end: Date | null
	/** The field the end of the bar comes from and edits go to: end date, else due date. */
	endField: EndField
}

export function taskDates(task: Task): TaskDates {
	const start = getTaskDate(task.start_date)
	const end = getTaskDate(task.end_date)
	const due = getTaskDate(task.due_date)
	return {
		start,
		end: end ?? due,
		endField: !end && due ? 'due_date' : 'end_date',
	}
}

/**
 * The last day an end covers. An end date at midnight closes the day before (how
 * calendars store all-day events); a due date at midnight is due that day.
 */
export function lastDayOf(end: Date, field: EndField): Date {
	const day = startOfDay(end)
	return field === 'end_date' && end.getTime() === day.getTime() ? addDays(day, -1) : day
}

function barFrom(start: Date | null, end: Date | null, endField: EndField, derived: boolean): GanttBar | null {
	if (start && end) {
		const first = startOfDay(start)
		const last = lastDayOf(end, endField)
		return {start: first, end: daysBetween(first, last) < 0 ? first : last, type: 'both', derived}
	}
	if (start) {
		const first = startOfDay(start)
		return {start: first, end: addDays(first, OPEN_END_DAYS - 1), type: 'startOnly', derived}
	}
	if (end) {
		const last = lastDayOf(end, endField)
		return {start: addDays(last, -(OPEN_END_DAYS - 1)), end: last, type: 'endOnly', derived}
	}
	return null
}

/**
 * The bar of a task: its start date to its end date, or to its due date when it has no
 * end. With only one of them the bar is open-ended; a dateless parent spans its subtasks.
 */
export function taskBar(task: Task, derived?: {start: Date | null, end: Date | null}): GanttBar | null {
	const {start, end, endField} = taskDates(task)
	return barFrom(start, end, endField, false)
		?? (derived ? barFrom(derived.start, derived.end, 'due_date', true) : null)
}

export function barIntersects(bar: GanttDaySpan, range: GanttRange): boolean {
	return daysBetween(bar.start, range.to) >= 0 && daysBetween(range.from, bar.end) >= 0
}

/** Gives a new date for a day, at the time a freshly picked date gets. */
export type NewDateTime = (day: Date) => Date

function keepOrder(patch: TaskPatch, dates: TaskDates, endField: EndField): TaskPatch {
	const start = (patch.start_date as Date | undefined) ?? dates.start
	const end = (patch[endField] as Date | undefined) ?? dates.end
	if (start && end && end < start) {
		return {...patch, [endField]: new Date(start)}
	}
	return patch
}

/**
 * The fields an edit of a task's bar writes. Existing dates move by whole days and keep
 * their time; the open side of an open-ended bar is only written when that side itself
 * changed, which gives the task its missing date.
 */
export function barEditPatch(task: Task, bar: GanttBar, edit: GanttBarEdit, newDateTime: NewDateTime): TaskPatch | null {
	if (bar.derived) {
		return null
	}
	const dates = taskDates(task)
	const resized = edit.start !== edit.end
	const patch: TaskPatch = {}

	if (edit.start !== 0) {
		if (dates.start) {
			patch.start_date = addDays(dates.start, edit.start)
		} else if (resized) {
			patch.start_date = newDateTime(addDays(bar.start, edit.start))
		}
	}
	if (edit.end !== 0) {
		if (dates.end) {
			patch[dates.endField] = addDays(dates.end, edit.end)
		} else if (resized) {
			patch.end_date = newDateTime(addDays(bar.end, edit.end))
		}
	}

	if (Object.keys(patch).length === 0) {
		return null
	}
	return keepOrder(patch, dates, dates.end ? dates.endField : 'end_date')
}

/** Start and end dates for a task drawn on a row without dates. */
export function drawnSpanPatch(span: GanttDaySpan, newDateTime: NewDateTime): TaskPatch {
	const start = newDateTime(span.start)
	const end = newDateTime(span.end)
	return {start_date: start, end_date: end < start ? start : end}
}

/** The dates a patch leaves on the task, for undoing it. */
export function previousDates(task: Task, patch: TaskPatch): TaskPatch {
	const previous: TaskPatch = {}
	for (const field of ['start_date', 'end_date', 'due_date'] as const) {
		if (patch[field] !== undefined) {
			previous[field] = getTaskDate(task[field])
		}
	}
	return previous
}
