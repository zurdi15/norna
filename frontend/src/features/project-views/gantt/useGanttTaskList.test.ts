import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {defineComponent, h} from 'vue'
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils'
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import type {TaskListParams} from '@/client/queries/tasks'

const sdk = vi.hoisted(() => ({
	projectViewTasksList: vi.fn(),
	patchTasksRead: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({error: vi.fn(), success: vi.fn()}))

import {useGanttTaskList} from './useGanttTaskList'

enableAutoUnmount(afterEach)

type ListRequest = {path: {project: number, view: number}, query: TaskListParams}

function task(id: number, overrides: Partial<Task> = {}): Task {
	return {id, title: `Task ${id}`, start_date: '2026-09-10T07:00:00Z', end_date: '2026-09-12T15:00:00Z', ...overrides}
}

function page(items: Task[], pageNumber: number, totalPages: number) {
	return {data: {items, page: pageNumber, per_page: 2, total: items.length * totalPages, total_pages: totalPages}}
}

let queryClient: QueryClient

beforeEach(() => {
	queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})
	sdk.projectViewTasksList.mockReset()
	sdk.patchTasksRead.mockReset()
})

function mountList(params: Omit<TaskListParams, 'page'> = {filter: 'x', per_page: 2}) {
	let state: ReturnType<typeof useGanttTaskList> | undefined
	const component = defineComponent({
		setup() {
			state = useGanttTaskList({kind: 'view', projectId: 2, viewId: 6}, params)
			return () => h('div')
		},
	})
	mount(component, {global: {plugins: [[VueQueryPlugin, {queryClient}]]}})
	return () => state!
}

describe('useGanttTaskList', () => {
	it('loads every page of the view and merges them without duplicates', async () => {
		sdk.projectViewTasksList.mockImplementation(({query}: ListRequest) => Promise.resolve(
			query.page === 1
				? page([task(1), task(2)], 1, 3)
				: query.page === 2
					? page([task(2), task(3)], 2, 3)
					: page([task(4)], 3, 3),
		))

		const list = mountList()
		expect(list().isPending.value).toBe(true)
		await flushPromises()

		expect(list().isPending.value).toBe(false)
		expect(list().tasks.value.map(item => item.id)).toEqual([1, 2, 3, 4])
		const requests = sdk.projectViewTasksList.mock.calls.map(([request]) => request as ListRequest)
		expect(requests.map(request => request.query.page)).toEqual([1, 2, 3])
		expect(requests.every(request => request.path.project === 2 && request.path.view === 6 && request.query.filter === 'x')).toBe(true)
	})

	it('saves a date change through a patch and shows it before the answer', async () => {
		sdk.projectViewTasksList.mockResolvedValue(page([task(1)], 1, 1))
		const list = mountList()
		await flushPromises()

		const moved = new Date(Date.UTC(2026, 8, 14, 7))
		let shownWhilePending: string | undefined
		sdk.patchTasksRead.mockImplementation(() => {
			shownWhilePending = list().tasks.value[0]!.start_date
			return Promise.resolve({data: task(1, {start_date: moved.toISOString()}), response: {status: 200}})
		})

		const saved = await list().updateTask(list().tasks.value[0]!, {start_date: moved})

		expect(saved).toBe(true)
		expect(shownWhilePending).toBe(moved.toISOString())
		expect(sdk.patchTasksRead).toHaveBeenCalledWith(expect.objectContaining({
			path: {task: 1},
			body: [{op: 'replace', path: '/start_date', value: moved.toISOString()}],
		}))
	})

	it('reports a failed save', async () => {
		sdk.projectViewTasksList.mockResolvedValue(page([task(1)], 1, 1))
		const list = mountList()
		await flushPromises()

		sdk.patchTasksRead.mockResolvedValue({error: {status: 500}, response: {status: 500}})

		expect(await list().updateTask(list().tasks.value[0]!, {start_date: new Date()})).toBe(false)
	})
})
