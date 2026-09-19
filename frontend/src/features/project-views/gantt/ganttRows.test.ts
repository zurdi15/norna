import {describe, expect, it} from 'vitest'

import type {Task} from '@/client/generated'
import {NO_DATE} from '@/modules/task/task'

import {buildGanttRows, type GanttRowsOptions} from './ganttRows'

const at = (month: number, date: number) => new Date(2026, month - 1, date, 9).toISOString()

function task(id: number, dates: {start?: string, end?: string, due?: string} = {}, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		done: false,
		start_date: dates.start ?? NO_DATE,
		end_date: dates.end ?? NO_DATE,
		due_date: dates.due ?? NO_DATE,
		related_tasks: {},
		...overrides,
	}
}

function subtaskOf(parent: number): Partial<Task> {
	return {related_tasks: {parenttask: [{id: parent}]}}
}

function parentOf(...children: number[]): Partial<Task> {
	return {related_tasks: {subtask: children.map(id => ({id}))}}
}

const options: GanttRowsOptions = {
	range: {from: new Date(2026, 8, 1), to: new Date(2026, 8, 30)},
	showUndated: false,
	collapsed: new Set(),
}

const ids = (tasks: Task[], extra: Partial<GanttRowsOptions> = {}) =>
	buildGanttRows(tasks, {...options, ...extra}).rows.map(row => row.id)

describe('buildGanttRows', () => {
	it('sorts by start, undated tasks last', () => {
		const tasks = [
			task(1, {start: at(9, 20), end: at(9, 22)}),
			task(2),
			task(3, {due: at(9, 5)}),
			task(4, {start: at(9, 10), end: at(9, 12)}),
		]
		expect(ids(tasks, {showUndated: true})).toEqual([3, 4, 1, 2])
	})

	it('shows tasks without dates only when asked', () => {
		const tasks = [task(1, {start: at(9, 10), end: at(9, 12)}), task(2)]
		expect(ids(tasks)).toEqual([1])
		expect(ids(tasks, {showUndated: true})).toEqual([1, 2])
		expect(buildGanttRows(tasks, {...options, showUndated: true}).rows[1]!.bar).toBeNull()
	})

	it('leaves out tasks whose bar misses the range', () => {
		const tasks = [
			task(1, {start: at(8, 1), end: at(8, 20)}),
			task(2, {start: at(8, 25), end: at(9, 2)}),
			task(3, {start: at(10, 5)}),
		]
		expect(ids(tasks)).toEqual([2])
	})

	it('keeps the parents of a task in range, with its indentation', () => {
		const tasks = [
			task(1, {start: at(6, 1), end: at(6, 5)}, parentOf(2)),
			task(2, {start: at(9, 10), end: at(9, 12)}, subtaskOf(1)),
		]
		const {rows} = buildGanttRows(tasks, options)
		expect(rows.map(row => [row.id, row.indent, row.isParent])).toEqual([[1, 0, true], [2, 1, false]])
	})

	it('sorts a dateless parent by the span of its subtasks', () => {
		const tasks = [
			task(1, {start: at(9, 8), end: at(9, 9)}),
			task(2, {}, parentOf(3)),
			task(3, {start: at(9, 3), end: at(9, 4)}, subtaskOf(2)),
		]
		const {rows} = buildGanttRows(tasks, options)
		expect(rows.map(row => row.id)).toEqual([2, 3, 1])
		expect(rows[0]!.bar).toMatchObject({derived: true})
	})

	it('hides the subtasks of a collapsed parent and maps them to it', () => {
		const tasks = [
			task(1, {start: at(9, 1), end: at(9, 20)}, parentOf(2)),
			task(2, {start: at(9, 2), end: at(9, 5)}, {related_tasks: {parenttask: [{id: 1}], subtask: [{id: 3}]}}),
			task(3, {start: at(9, 3), end: at(9, 4)}, subtaskOf(2)),
		]
		const result = buildGanttRows(tasks, {...options, collapsed: new Set([1])})
		expect(result.rows.map(row => row.id)).toEqual([1])
		expect([...result.hiddenToAncestor]).toEqual([[2, 1], [3, 1]])
	})

	it('only marks parents whose subtasks are on the chart', () => {
		const tasks = [
			task(1, {start: at(9, 1), end: at(9, 20)}, parentOf(2)),
			task(2, {start: at(11, 2), end: at(11, 5)}, subtaskOf(1)),
		]
		expect(buildGanttRows(tasks, options).rows[0]!.isParent).toBe(false)
	})

	it('drops duplicates and tasks without an id', () => {
		const first = task(1, {start: at(9, 1), end: at(9, 2)})
		expect(ids([first, {...first, title: 'again'}, {title: 'no id'}])).toEqual([1])
	})
})

describe('buildGanttRows sort keys', () => {
	it('keeps a task in its place while its dates change, and sorts new tasks in', () => {
		const sortKeys = new Map()
		const first = [
			task(1, {start: at(9, 5), end: at(9, 6)}),
			task(2, {start: at(9, 10), end: at(9, 12)}),
		]
		expect(ids(first, {sortKeys})).toEqual([1, 2])

		const moved = [
			task(1, {start: at(9, 20), end: at(9, 21)}),
			task(2, {start: at(9, 10), end: at(9, 12)}),
			task(3, {start: at(9, 8), end: at(9, 9)}),
		]
		expect(ids(moved, {sortKeys})).toEqual([1, 3, 2])
		expect(ids(moved)).toEqual([3, 2, 1])
	})
})
