import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {defineComponent, h} from 'vue'
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils'
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'

const sdk = vi.hoisted(() => ({
	projectViewBucketsTasksList: vi.fn(),
	projectViewTasksList: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)

import {useBucketTasks, useTaskBoard} from './useTaskBoard'

enableAutoUnmount(afterEach)

function cards(from: number, count: number): Task[] {
	return Array.from({length: count}, (_, index) => ({id: from + index, position: (from + index) * 100}))
}

let queryClient: QueryClient

beforeEach(() => {
	queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})
	sdk.projectViewBucketsTasksList.mockReset()
	sdk.projectViewTasksList.mockReset()
	sdk.projectViewBucketsTasksList.mockResolvedValue({data: {items: [
		{id: 10, position: 1, count: 27, tasks: cards(1, 25)},
		{id: 11, position: 2, count: 1, tasks: cards(100, 1)},
	]}})
})

async function mountBucket(bucketIndex: number) {
	let bucketTasks!: ReturnType<typeof useBucketTasks>
	mount(defineComponent({
		setup() {
			const {buckets} = useTaskBoard(1, 6)
			bucketTasks = useBucketTasks({
				projectId: 1,
				viewId: 6,
				bucket: () => buckets.value[bucketIndex] ?? {id: 0, tasks: [], count: 0},
			})
			return () => h('div')
		},
	}), {global: {plugins: [[VueQueryPlugin, {queryClient}]]}})
	await flushPromises()
	return bucketTasks
}

describe('useBucketTasks', () => {
	it('shows the board page and loads later pages only when asked', async () => {
		sdk.projectViewTasksList.mockResolvedValue({data: {items: cards(26, 2), page: 2, total: 27, total_pages: 2}})
		const bucket = await mountBucket(0)

		expect(bucket.tasks.value).toHaveLength(25)
		expect(bucket.hasMore.value).toBe(true)
		expect(sdk.projectViewTasksList).not.toHaveBeenCalled()

		await bucket.loadMore()
		await flushPromises()

		expect(sdk.projectViewTasksList.mock.calls[0]?.[0].query).toMatchObject({page: 2, filter: '(bucket_id = 10)', sort_by: ['position']})
		expect(bucket.tasks.value.map(task => task.id)).toEqual(cards(1, 27).map(task => task.id))
		expect(bucket.hasMore.value).toBe(false)
	})

	it('has nothing more to load for a bucket the board holds completely', async () => {
		const bucket = await mountBucket(1)

		await bucket.loadMore()
		await flushPromises()

		expect(bucket.hasMore.value).toBe(false)
		expect(sdk.projectViewTasksList).not.toHaveBeenCalled()
	})
})
