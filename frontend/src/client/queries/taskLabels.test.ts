import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	taskLabelsBulkReplace: vi.fn(),
	taskLabelsCreate: vi.fn(),
	taskLabelsDelete: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {addTaskLabelMutationOptions, removeTaskLabelMutationOptions, replaceTaskLabelsMutationOptions} from './taskLabels'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const urgent = {id: 1, title: 'urgent'}
const home = {id: 2, title: 'home'}
const boardKey = taskKeys.board(1, 6, {})

function labels() {
	return {
		detail: queryClient.getQueryData<Task>(taskKeys.detail(5))?.labels,
		board: queryClient.getQueryData<{tasks: Task[]}[]>(boardKey)?.[0]?.tasks[0]?.labels,
	}
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
	queryClient.setQueryData(taskKeys.detail(5), {id: 5, labels: [urgent]})
	queryClient.setQueryData(boardKey, [{id: 10, count: 1, tasks: [{id: 5, labels: [urgent]}]}])
})

describe('task labels', () => {
	it('adds a label to the task wherever it is cached', async () => {
		sdk.taskLabelsCreate.mockResolvedValue({data: {label_id: 2}})

		await run(addTaskLabelMutationOptions(), {taskId: 5, label: home})

		expect(sdk.taskLabelsCreate).toHaveBeenCalledWith({path: {task: 5}, body: {label_id: 2}})
		expect(labels()).toEqual({detail: [urgent, home], board: [urgent, home]})
		// The picker shows the change in place, so there is no toast.
		expect(message.success).not.toHaveBeenCalled()
	})

	it('removes a label', async () => {
		sdk.taskLabelsDelete.mockResolvedValue({data: undefined})

		await run(removeTaskLabelMutationOptions(), {taskId: 5, label: urgent})

		expect(sdk.taskLabelsDelete).toHaveBeenCalledWith({path: {task: 5, label: 1}})
		expect(labels()).toEqual({detail: [], board: []})
	})

	it('replaces all labels with what the server kept', async () => {
		sdk.taskLabelsBulkReplace.mockResolvedValue({data: {labels: [home]}})

		await run(replaceTaskLabelsMutationOptions(), {taskId: 5, labels: [home]})

		expect(sdk.taskLabelsBulkReplace).toHaveBeenCalledWith({path: {task: 5}, body: {labels: [home]}})
		expect(labels()).toEqual({detail: [home], board: [home]})
	})

	it('keeps the labels when the request fails', async () => {
		sdk.taskLabelsDelete.mockRejectedValue({status: 403})

		await expect(run(removeTaskLabelMutationOptions(), {taskId: 5, label: urgent})).rejects.toEqual({status: 403})

		expect(labels().detail).toEqual([urgent])
	})
})
