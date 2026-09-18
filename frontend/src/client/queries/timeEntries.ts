import {queryOptions, useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {
	taskTimeEntriesList,
	timeEntriesCreate,
	timeEntriesDelete,
	timeEntriesList,
	timeEntriesTimerStop,
	timeEntriesUpdate,
} from '@/client/generated'
import type {TimeEntry, TimeEntryWritable} from '@/client/generated'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'
import {patchTaskInCaches} from './tasks'

export interface TimeEntryListParams {
	filter?: string
	filter_timezone?: string
}

// Not under ['tasks']: entries are not task-shaped.
export const timeEntryKeys = {
	all: ['time-entries'] as const,
	list: (params: TimeEntryListParams) => ['time-entries', 'list', params] as const,
	task: (taskId: number) => ['time-entries', 'task', taskId] as const,
	activeTimers: () => ['time-entries', 'active'] as const,
	active: (userId: number) => ['time-entries', 'active', userId] as const,
}

const TIME_ENTRIES_PER_PAGE = 250

/** A null end time is the running timer. */
export function isRunning(entry: Pick<TimeEntry, 'end_time'>): boolean {
	return !entry.end_time
}

export function timeEntriesQuery(params: TimeEntryListParams = {}) {
	return queryOptions({
		queryKey: timeEntryKeys.list(params),
		queryFn: () => fetchAllPages(async page =>
			(await timeEntriesList({query: {...params, page, per_page: TIME_ENTRIES_PER_PAGE}})).data,
		),
	})
}

export function taskTimeEntriesQuery(taskId: number) {
	return queryOptions({
		queryKey: timeEntryKeys.task(taskId),
		queryFn: () => fetchAllPages(async page =>
			(await taskTimeEntriesList({path: {task_id: taskId}, query: {page, per_page: TIME_ENTRIES_PER_PAGE}})).data,
		),
		enabled: taskId > 0,
	})
}

/** The user's running timer, or null. The server keeps at most one. */
export function activeTimerQuery(userId: number) {
	return queryOptions({
		queryKey: timeEntryKeys.active(userId),
		queryFn: async (): Promise<TimeEntry | null> => {
			const {data} = await timeEntriesList({query: {filter: `user_id = ${userId} && end_time = null`, per_page: 1}})
			return data.items?.[0] ?? null
		},
		enabled: userId > 0,
	})
}

function editEntryLists(client: QueryClient, edit: (entries: TimeEntry[]) => TimeEntry[]) {
	client.setQueriesData({queryKey: timeEntryKeys.all}, (current: unknown) =>
		Array.isArray(current) ? edit(current) : undefined,
	)
}

function replaceEntry(client: QueryClient, entry: TimeEntry) {
	editEntryLists(client, entries => entries.map(existing => existing.id === entry.id ? entry : existing))
}

// Starting a timer stops the previous one on the server, so a running entry always takes the slot.
function applyToActiveTimer(client: QueryClient, entry: TimeEntry) {
	if (typeof entry.user_id !== 'number') {
		return
	}
	client.setQueryData<TimeEntry | null>(timeEntryKeys.active(entry.user_id), current => {
		if (current === undefined) {
			return current
		}
		if (isRunning(entry)) {
			return entry
		}
		return current?.id === entry.id ? null : current
	})
}

function adjustTimeEntryCount(client: QueryClient, taskId: number | undefined, delta: number) {
	if (!taskId) {
		return
	}
	patchTaskInCaches(client, taskId, task => typeof task.time_entries_count === 'number'
		? {...task, time_entries_count: Math.max(0, task.time_entries_count + delta)}
		: task,
	)
}

const invalidateTimeEntries = (client: QueryClient) => client.invalidateQueries({queryKey: timeEntryKeys.all})

/** A manual entry, or a running timer when end_time is left out. Exactly one of task_id / project_id. */
export function createTimeEntryMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (entry: TimeEntryWritable) => {
			const {data} = await timeEntriesCreate({body: entry})
			return data
		},
		onSuccess: (created, _entry, client) => {
			applyToActiveTimer(client, created)
			adjustTimeEntryCount(client, created.task_id, 1)
		},
		onSettled: (_entry, client) => invalidateTimeEntries(client),
	})
}

export interface UpdateTimeEntryInput {
	id: number
	/** PUT replaces every editable field. */
	entry: Required<Pick<TimeEntryWritable, 'start_time' | 'comment'>> & TimeEntryWritable
}

export function updateTimeEntryMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, entry}: UpdateTimeEntryInput) => {
			const {data} = await timeEntriesUpdate({path: {id}, body: entry})
			return data
		},
		onSuccess: (updated, _input, client) => {
			replaceEntry(client, updated)
			applyToActiveTimer(client, updated)
		},
		onSettled: (_input, client) => invalidateTimeEntries(client),
	})
}

export interface DeleteTimeEntryInput {
	id: number
	taskId?: number
}

export function deleteTimeEntryMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id}: DeleteTimeEntryInput) => {
			await timeEntriesDelete({path: {id}})
		},
		optimistic: {
			queryKeys: () => [timeEntryKeys.all],
			update: ({id}, client) => {
				editEntryLists(client, entries => entries.filter(entry => entry.id !== id))
				// Deleting the running timer removes it.
				client.setQueriesData<TimeEntry | null>({queryKey: timeEntryKeys.activeTimers()}, current =>
					current?.id === id ? null : undefined,
				)
			},
		},
		onSuccess: (_data, {taskId}, client) => adjustTimeEntryCount(client, taskId, -1),
		onSettled: (_input, client) => invalidateTimeEntries(client),
	})
}

export function stopTimerMutationOptions() {
	return contextMutationOptions<TimeEntry, void>({
		mutationFn: async () => {
			const {data} = await timeEntriesTimerStop()
			return data
		},
		onSuccess: (stopped, _input, client) => {
			replaceEntry(client, stopped)
			applyToActiveTimer(client, stopped)
		},
		onSettled: (_input, client) => invalidateTimeEntries(client),
	})
}

export function useCreateTimeEntryMutation() {
	return useMutation(createTimeEntryMutationOptions())
}

export function useUpdateTimeEntryMutation() {
	return useMutation(updateTimeEntryMutationOptions())
}

export function useDeleteTimeEntryMutation() {
	return useMutation(deleteTimeEntryMutationOptions())
}

export function useStopTimerMutation() {
	return useMutation(stopTimerMutationOptions())
}
