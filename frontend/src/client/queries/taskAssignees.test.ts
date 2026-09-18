import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	taskAssigneesBulk: vi.fn(),
	taskAssigneesCreate: vi.fn(),
	taskAssigneesDelete: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {addAssigneeMutationOptions, removeAssigneeMutationOptions, replaceAssigneesMutationOptions} from './taskAssignees'
import {taskKeys, type TaskPage} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const alice = {id: 1, username: 'alice'}
const bob = {id: 2, username: 'bob'}
const listKey = taskKeys.list({kind: 'all'}, {})

function assignees() {
	return {
		detail: queryClient.getQueryData<Task>(taskKeys.detail(5))?.assignees,
		list: queryClient.getQueryData<TaskPage>(listKey)?.items[0]?.assignees,
	}
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
	queryClient.setQueryData(taskKeys.detail(5), {id: 5, assignees: [alice]})
	queryClient.setQueryData<TaskPage>(listKey, {items: [{id: 5, assignees: [alice]}], page: 1, per_page: 50, total: 1, total_pages: 1})
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('task assignees', () => {
	it('assigns a user in every cached copy of the task', async () => {
		sdk.taskAssigneesCreate.mockResolvedValue({data: {user_id: 2}})

		await run(addAssigneeMutationOptions(), {taskId: 5, user: bob})

		expect(sdk.taskAssigneesCreate).toHaveBeenCalledWith({path: {task: 5}, body: {user_id: 2}})
		expect(assignees()).toEqual({detail: [alice, bob], list: [alice, bob]})
		// The picker shows the change in place, so there is no toast.
		expect(message.success).not.toHaveBeenCalled()
	})

	it('refetches active lists, which can filter by assignee', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.taskAssigneesDelete.mockResolvedValue({data: undefined})

		await run(removeAssigneeMutationOptions(), {taskId: 5, user: alice})

		expect(sdk.taskAssigneesDelete).toHaveBeenCalledWith({path: {task: 5, user: 1}})
		expect(assignees()).toEqual({detail: [], list: []})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
	})

	it('leaves the assignees alone when the request fails', async () => {
		sdk.taskAssigneesCreate.mockRejectedValue({status: 403})

		await expect(run(addAssigneeMutationOptions(), {taskId: 5, user: bob})).rejects.toEqual({status: 403})

		expect(assignees().detail).toEqual([alice])
	})

	it('replaces every assignee with the saved set', async () => {
		sdk.taskAssigneesBulk.mockResolvedValue({data: {assignees: [bob]}})

		await run(replaceAssigneesMutationOptions(), {taskId: 5, users: [bob]})

		expect(sdk.taskAssigneesBulk).toHaveBeenCalledWith({path: {task: 5}, body: {assignees: [bob]}})
		expect(assignees()).toEqual({detail: [bob], list: [bob]})
	})
})
