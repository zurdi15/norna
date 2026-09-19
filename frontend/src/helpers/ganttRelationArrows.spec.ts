import {describe, expect, it} from 'vitest'

import type {Task} from '@/client/generated'

import {arrowPath, buildRelationArrows, type GanttBarPosition} from './ganttRelationArrows'

function makeTask(id: number, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		related_tasks: {},
		...overrides,
	}
}

function taskMap(...tasks: Task[]): Map<number, Task> {
	return new Map(tasks.map(task => [task.id!, task]))
}

const twoBars = new Map<number, GanttBarPosition>([
	[1, {x: 0, y: 20, width: 100, rowIndex: 0}],
	[2, {x: 150, y: 60, width: 100, rowIndex: 1}],
])

describe('buildRelationArrows', () => {
	it('returns empty array when no dependency relations exist', () => {
		const result = buildRelationArrows(taskMap(makeTask(1), makeTask(2)), twoBars, new Map())
		expect(result).toHaveLength(0)
	})

	it('creates arrow for blocking relation', () => {
		const tasks = taskMap(
			makeTask(1, {related_tasks: {blocking: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {blocked: [makeTask(1)]}}),
		)

		const result = buildRelationArrows(tasks, twoBars, new Map())

		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			fromTaskId: 1,
			toTaskId: 2,
			startX: 100,
			endX: 150,
			relationKind: 'blocking',
		})
	})

	it('creates arrow for precedes relation', () => {
		const tasks = taskMap(
			makeTask(1, {related_tasks: {precedes: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {follows: [makeTask(1)]}}),
		)

		const result = buildRelationArrows(tasks, twoBars, new Map())

		expect(result).toHaveLength(1)
		expect(result[0]!.relationKind).toBe('precedes')
	})

	it('skips arrows when target task is not visible', () => {
		const tasks = taskMap(makeTask(1, {related_tasks: {blocking: [makeTask(99)]}}))
		expect(buildRelationArrows(tasks, twoBars, new Map())).toHaveLength(0)
	})

	it('re-routes arrows to parent when child is collapsed', () => {
		const tasks = taskMap(
			makeTask(1, {related_tasks: {blocking: [makeTask(3)]}}),
			makeTask(2),
			makeTask(3, {related_tasks: {blocked: [makeTask(1)]}}),
		)
		const positions = new Map<number, GanttBarPosition>([
			[1, {x: 0, y: 20, width: 100, rowIndex: 0}],
			[2, {x: 50, y: 60, width: 200, rowIndex: 1}],
		])

		const result = buildRelationArrows(tasks, positions, new Map([[3, 2]]))

		expect(result).toHaveLength(1)
		expect(result[0]!.toTaskId).toBe(2)
		expect(result[0]!.endX).toBe(50)
	})

	it('drops arrows between a collapsed parent and its own subtask', () => {
		const tasks = taskMap(
			makeTask(2, {related_tasks: {precedes: [makeTask(3)]}}),
			makeTask(3),
		)
		const positions = new Map<number, GanttBarPosition>([[2, {x: 50, y: 60, width: 200, rowIndex: 1}]])

		expect(buildRelationArrows(tasks, positions, new Map([[3, 2]]))).toHaveLength(0)
	})

	it('deduplicates bidirectional relations', () => {
		const tasks = taskMap(
			makeTask(1, {related_tasks: {blocking: [makeTask(2)]}}),
			makeTask(2, {related_tasks: {blocking: [makeTask(1)]}}),
		)

		expect(buildRelationArrows(tasks, twoBars, new Map())).toHaveLength(1)
	})

	it('fans out arrows leaving the same bar', () => {
		const positions = new Map<number, GanttBarPosition>([
			...twoBars,
			[3, {x: 150, y: 100, width: 100, rowIndex: 2}],
		])
		const tasks = taskMap(
			makeTask(1, {related_tasks: {precedes: [makeTask(2), makeTask(3)]}}),
			makeTask(2),
			makeTask(3),
		)

		const [first, second] = buildRelationArrows(tasks, positions, new Map())

		expect(first!.startY).toBe(17)
		expect(second!.startY).toBe(23)
	})
})

describe('arrowPath', () => {
	it('curves straight into a target on the right', () => {
		const path = arrowPath({fromTaskId: 1, toTaskId: 2, startX: 100, startY: 20, endX: 150, endY: 60, relationKind: 'precedes'}, 36)
		expect(path.startsWith('M 100 20 C')).toBe(true)
		expect(path.endsWith('150 60')).toBe(true)
	})

	it('detours along the row gap when the target starts earlier', () => {
		const path = arrowPath({fromTaskId: 1, toTaskId: 2, startX: 100, startY: 20, endX: 40, endY: 56, relationKind: 'precedes'}, 36)
		expect(path).toContain('L 40 38')
		expect(path.endsWith('40 56')).toBe(true)
	})
})
