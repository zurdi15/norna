import {describe, expect, it} from 'vitest'

import type {Task} from '@/client/generated'

import {nestTasks} from './listNesting'

function task(id: number, parent?: number): Task {
	return {id, title: `Task ${id}`, related_tasks: parent ? {parenttask: [{id: parent}]} : {}}
}

const shape = (tasks: Task[]) => nestTasks(tasks).map(({task: top, subtasks}) => [top.id, subtasks.map(sub => sub.id)])

describe('nestTasks', () => {
	it('nests a subtask under its parent when both are listed', () => {
		expect(shape([task(1), task(2, 1), task(3)])).toEqual([[1, [2]], [3, []]])
	})

	it('keeps a subtask at the top when its parent is not in the list', () => {
		expect(shape([task(2, 99), task(3)])).toEqual([[2, []], [3, []]])
	})

	it('keeps the list order for top-level tasks and for subtasks', () => {
		expect(shape([task(4, 1), task(1), task(5, 1)])).toEqual([[1, [4, 5]]])
	})

	it('puts a subtask with several listed parents under the first one only', () => {
		const shared: Task = {id: 3, related_tasks: {parenttask: [{id: 2}, {id: 1}]}}
		expect(shape([task(1), task(2), shared])).toEqual([[1, []], [2, [3]]])
	})
})
