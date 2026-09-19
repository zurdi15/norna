import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task, TimeEntry} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	taskTimeEntriesList: vi.fn(),
	timeEntriesCreate: vi.fn(),
	timeEntriesDelete: vi.fn(),
	timeEntriesList: vi.fn(),
	timeEntriesTimerStop: vi.fn(),
	timeEntriesUpdate: vi.fn(),
}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))

import {taskKeys} from './tasks'
import {
	activeTimerQuery,
	createTimeEntryMutationOptions,
	deleteTimeEntryMutationOptions,
	stopTimerMutationOptions,
	taskTimeEntriesQuery,
	timeEntriesQuery,
	timeEntryKeys,
	updateTimeEntryMutationOptions,
} from './timeEntries'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const running: TimeEntry = {id: 1, user_id: 4, task_id: 5, start_time: '2026-09-18T08:00:00Z', end_time: null}
const finished: TimeEntry = {id: 2, user_id: 4, task_id: 5, start_time: '2026-09-17T08:00:00Z', end_time: '2026-09-17T09:00:00Z'}
const listKey = timeEntryKeys.list({filter: 'start_time > now-7d'})

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
})

describe('time entry queries', () => {
	it('loads the running timer of the user', async () => {
		sdk.timeEntriesList.mockResolvedValue({data: {items: [running], total_pages: 1}})

		await expect(queryClient.fetchQuery(activeTimerQuery(4))).resolves.toEqual(running)

		expect(sdk.timeEntriesList).toHaveBeenCalledWith({query: {filter: 'user_id = 4 && end_time = null', per_page: 1}})
	})

	it('reports no timer as null', async () => {
		sdk.timeEntriesList.mockResolvedValue({data: {items: null}})

		await expect(queryClient.fetchQuery(activeTimerQuery(4))).resolves.toBeNull()
	})

	it('loads every page of a filtered list and of a task', async () => {
		sdk.timeEntriesList
			.mockResolvedValueOnce({data: {items: [running], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [finished], total_pages: 2}})
		sdk.taskTimeEntriesList.mockResolvedValue({data: {items: [finished], total_pages: 1}})

		await expect(queryClient.fetchQuery(timeEntriesQuery({filter: 'x', filter_timezone: 'Europe/Madrid'}))).resolves.toEqual([running, finished])
		await queryClient.fetchQuery(taskTimeEntriesQuery(5))

		expect(sdk.timeEntriesList).toHaveBeenLastCalledWith({query: {filter: 'x', filter_timezone: 'Europe/Madrid', page: 2, per_page: 250}})
		expect(sdk.taskTimeEntriesList).toHaveBeenCalledWith({path: {task_id: 5}, query: {page: 1, per_page: 250}})
	})
})

describe('time entry writes', () => {
	beforeEach(() => {
		queryClient.setQueryData(timeEntryKeys.active(4), null)
		queryClient.setQueryData(listKey, [finished])
		queryClient.setQueryData(taskKeys.detail(5), {id: 5, time_entries_count: 1} satisfies Task)
	})

	it('shows a started timer as the running one and counts it on the task', async () => {
		sdk.timeEntriesCreate.mockResolvedValue({data: running})

		await run(createTimeEntryMutationOptions(), {task_id: 5, start_time: running.start_time})

		expect(sdk.timeEntriesCreate).toHaveBeenCalledWith({body: {task_id: 5, start_time: running.start_time}})
		expect(queryClient.getQueryData(timeEntryKeys.active(4))).toEqual(running)
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.time_entries_count).toBe(2)
	})

	it('leaves the running timer alone for a finished manual entry', async () => {
		queryClient.setQueryData(timeEntryKeys.active(4), running)
		sdk.timeEntriesCreate.mockResolvedValue({data: {...finished, id: 3}})

		await run(createTimeEntryMutationOptions(), {task_id: 5, start_time: finished.start_time, end_time: finished.end_time})

		expect(queryClient.getQueryData(timeEntryKeys.active(4))).toEqual(running)
	})

	it('does not load the running timer for someone who never asked for it', async () => {
		queryClient.removeQueries({queryKey: timeEntryKeys.active(4)})
		sdk.timeEntriesCreate.mockResolvedValue({data: running})

		await run(createTimeEntryMutationOptions(), {task_id: 5, start_time: running.start_time})

		expect(queryClient.getQueryState(timeEntryKeys.active(4))).toBeUndefined()
	})

	it('stops the timer and updates the entry in the loaded lists', async () => {
		queryClient.setQueryData(timeEntryKeys.active(4), running)
		queryClient.setQueryData(listKey, [running, finished])
		const stopped = {...running, end_time: '2026-09-18T09:30:00Z'}
		sdk.timeEntriesTimerStop.mockResolvedValue({data: stopped})

		await run(stopTimerMutationOptions(), undefined)

		expect(queryClient.getQueryData(timeEntryKeys.active(4))).toBeNull()
		expect(queryClient.getQueryData(listKey)).toEqual([stopped, finished])
	})

	it('replaces an edited entry', async () => {
		const edited = {...finished, comment: 'meeting'}
		sdk.timeEntriesUpdate.mockResolvedValue({data: edited})

		await run(updateTimeEntryMutationOptions(), {id: 2, entry: {comment: 'meeting', start_time: finished.start_time!, end_time: finished.end_time, task_id: 5}})

		expect(sdk.timeEntriesUpdate).toHaveBeenCalledWith({path: {id: 2}, body: {comment: 'meeting', start_time: finished.start_time, end_time: finished.end_time, task_id: 5}})
		expect(queryClient.getQueryData(listKey)).toEqual([edited])
	})

	it('removes a deleted running timer right away and restores it when the delete fails', async () => {
		queryClient.setQueryData(timeEntryKeys.active(4), running)
		queryClient.setQueryData(listKey, [running, finished])
		sdk.timeEntriesDelete.mockImplementation(async () => {
			expect(queryClient.getQueryData(timeEntryKeys.active(4))).toBeNull()
			expect(queryClient.getQueryData(listKey)).toEqual([finished])
			throw {status: 500}
		})

		await expect(run(deleteTimeEntryMutationOptions(), {id: 1, taskId: 5})).rejects.toEqual({status: 500})

		expect(queryClient.getQueryData(timeEntryKeys.active(4))).toEqual(running)
		expect(queryClient.getQueryData(listKey)).toEqual([running, finished])
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.time_entries_count).toBe(1)
	})

	it('uncounts a deleted entry on its task', async () => {
		sdk.timeEntriesDelete.mockResolvedValue({data: undefined})

		await run(deleteTimeEntryMutationOptions(), {id: 2, taskId: 5})

		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.time_entries_count).toBe(0)
	})
})
