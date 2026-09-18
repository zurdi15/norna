import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	tasksRelationsCreate: vi.fn(),
	tasksRelationsDelete: vi.fn(),
}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))

import {createRelationMutationOptions, deleteRelationMutationOptions} from './taskRelations'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const parent = {id: 1, title: 'Parent', related_tasks: {related: [{id: 9, title: 'Other'}]}}
const child = {id: 2, title: 'Child'}

function related(id: number) {
	return queryClient.getQueryData<Task>(taskKeys.detail(id))?.related_tasks
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	queryClient.setQueryData(taskKeys.detail(1), parent)
	queryClient.setQueryData(taskKeys.detail(2), child)
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('task relations', () => {
	it('adds the relation to both tasks, the other one inverted', async () => {
		sdk.tasksRelationsCreate.mockResolvedValue({data: {other_task_id: 2, relation_kind: 'subtask'}})

		await run(createRelationMutationOptions(), {task: parent, otherTask: child, relationKind: 'subtask'})

		expect(sdk.tasksRelationsCreate).toHaveBeenCalledWith({path: {task: 1}, body: {other_task_id: 2, relation_kind: 'subtask'}})
		expect(related(1)).toEqual({related: [{id: 9, title: 'Other'}], subtask: [child]})
		expect(related(2)).toEqual({parenttask: [{id: 1, title: 'Parent'}]})
	})

	it('refetches lists for a subtask relation, which nests them differently', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.tasksRelationsCreate.mockResolvedValue({data: {}})

		await run(createRelationMutationOptions(), {task: parent, otherTask: child, relationKind: 'subtask'})

		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
	})

	it('only marks lists stale for other relations', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.tasksRelationsCreate.mockResolvedValue({data: {}})

		await run(createRelationMutationOptions(), {task: parent, otherTask: child, relationKind: 'blocking'})

		expect(related(2)).toEqual({blocked: [{id: 1, title: 'Parent'}]})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'none'})
	})

	it('removes the relation from both tasks', async () => {
		queryClient.setQueryData(taskKeys.detail(9), {id: 9, related_tasks: {related: [{id: 1}]}})
		sdk.tasksRelationsDelete.mockResolvedValue({data: undefined})

		await run(deleteRelationMutationOptions(), {taskId: 1, otherTaskId: 9, relationKind: 'related'})

		expect(sdk.tasksRelationsDelete).toHaveBeenCalledWith({path: {task: 1, relationKind: 'related', otherTask: 9}})
		expect(related(1)).toEqual({})
		expect(related(9)).toEqual({})
	})
})
