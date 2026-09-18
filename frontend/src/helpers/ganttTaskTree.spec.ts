import {describe, expect, it} from 'vitest'

import type {Task} from '@/client/generated'
import {NO_DATE} from '@/modules/task/task'

import {buildGanttTaskTree} from './ganttTaskTree'

function makeTask(id: number, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		start_date: '2026-03-01T00:00:00Z',
		end_date: '2026-03-10T00:00:00Z',
		due_date: NO_DATE,
		done: false,
		related_tasks: {},
		...overrides,
	}
}

function taskMap(...tasks: Task[]): Map<number, Task> {
	return new Map(tasks.map(task => [task.id!, task]))
}

describe('buildGanttTaskTree', () => {
	it('returns flat list when no relations exist', () => {
		const result = buildGanttTaskTree(taskMap(makeTask(1), makeTask(2)))

		expect(result).toHaveLength(2)
		expect(result[0]!.task.id).toBe(1)
		expect(result[0]!.indentLevel).toBe(0)
		expect(result[0]!.isParent).toBe(false)
		expect(result[0]!.parentId).toBeNull()
		expect(result[1]!.task.id).toBe(2)
		expect(result[1]!.indentLevel).toBe(0)
	})

	it('nests subtasks under parents in depth-first order', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(1, {related_tasks: {subtask: [makeTask(2), makeTask(3)]}}),
			makeTask(2, {related_tasks: {parenttask: [makeTask(1)]}}),
			makeTask(3, {related_tasks: {parenttask: [makeTask(1)]}}),
		))

		expect(result.map(node => node.task.id)).toEqual([1, 2, 3])
		expect(result[0]!.isParent).toBe(true)
		expect(result[0]!.childIds).toEqual([2, 3])
		expect(result[1]!.indentLevel).toBe(1)
		expect(result[1]!.parentId).toBe(1)
		expect(result[2]!.indentLevel).toBe(1)
	})

	it('orders roots and siblings like the map, not like the relation lists', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(9),
			makeTask(3, {related_tasks: {parenttask: [makeTask(1)]}}),
			makeTask(1, {related_tasks: {subtask: [makeTask(2), makeTask(3)]}}),
			makeTask(2, {related_tasks: {parenttask: [makeTask(1)]}}),
		))

		expect(result.map(node => node.task.id)).toEqual([9, 1, 3, 2])
	})

	it('handles multi-level nesting', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(1, {related_tasks: {subtask: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {parenttask: [makeTask(1)], subtask: [makeTask(3)]}}),
			makeTask(3, {related_tasks: {parenttask: [makeTask(2)]}}),
		))

		expect(result.map(node => node.indentLevel)).toEqual([0, 1, 2])
		expect(result[1]!.isParent).toBe(true)
		expect(result[2]!.parentId).toBe(2)
	})

	it('caps indent level at max depth', () => {
		const tasks: Task[] = []
		for (let i = 1; i <= 6; i++) {
			const related: NonNullable<Task['related_tasks']> = {}
			if (i > 1) related.parenttask = [makeTask(i - 1)]
			if (i < 6) related.subtask = [makeTask(i + 1)]
			tasks.push(makeTask(i, {related_tasks: related}))
		}

		const result = buildGanttTaskTree(taskMap(...tasks))

		expect(result[4]!.indentLevel).toBe(4)
		expect(result[5]!.indentLevel).toBe(4)
	})

	it('calculates derived dates for dateless parents from children', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(1, {
				start_date: NO_DATE,
				end_date: NO_DATE,
				related_tasks: {subtask: [makeTask(2), makeTask(3)]},
			}),
			makeTask(2, {
				start_date: '2026-03-05T00:00:00Z',
				end_date: '2026-03-10T00:00:00Z',
				related_tasks: {parenttask: [makeTask(1)]},
			}),
			makeTask(3, {
				start_date: '2026-03-01T00:00:00Z',
				end_date: NO_DATE,
				due_date: '2026-03-15T00:00:00Z',
				related_tasks: {parenttask: [makeTask(1)]},
			}),
		))

		expect(result[0]!.derivedStartDate?.toISOString()).toContain('2026-03-01')
		expect(result[0]!.derivedEndDate?.toISOString()).toContain('2026-03-15')
		expect(result[0]!.hasDerivedDates).toBe(true)
	})

	it('keeps parents with their own dates underived', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(1, {related_tasks: {subtask: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {parenttask: [makeTask(1)]}}),
		))

		expect(result[0]!.hasDerivedDates).toBe(false)
	})

	it('still gives every task a row when parents form a cycle', () => {
		const result = buildGanttTaskTree(taskMap(
			makeTask(1, {related_tasks: {parenttask: [makeTask(2)], subtask: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {parenttask: [makeTask(1)], subtask: [makeTask(1)]}}),
		))

		expect(result.map(node => node.task.id).sort()).toEqual([1, 2])
	})
})
