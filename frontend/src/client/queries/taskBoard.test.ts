import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {InfiniteData, MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	bucketsCreate: vi.fn(),
	bucketsDelete: vi.fn(),
	bucketsUpdate: vi.fn(),
	projectViewBucketsTasksList: vi.fn(),
	projectViewTasksList: vi.fn(),
	taskBucketUpdate: vi.fn(),
	tasksPositionUpdate: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {projectKeys} from './projects'
import {
	bucketPageQuery,
	bucketTasksQuery,
	createBucketMutationOptions,
	deleteBucketMutationOptions,
	mergeBucketTasks,
	moveTaskMutationOptions,
	positionForIndex,
	renameBucketMutationOptions,
	taskBoardQuery,
	type BoardBucket,
} from './taskBoard'
import {taskKeys, type TaskPage} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

function card(id: number, position: number, overrides: Partial<Task> = {}): Task {
	return {id, title: `Card ${id}`, done: false, position, ...overrides}
}

function bucket(id: number, tasks: Task[], overrides: Partial<BoardBucket> = {}): BoardBucket {
	return {id, title: `Bucket ${id}`, project_view_id: 6, position: id, count: tasks.length, limit: 0, tasks, ...overrides}
}

const boardKey = taskKeys.board(1, 6, {})
const TODO = 10
const DOING = 11
const DONE = 12

function seedBoard() {
	queryClient.setQueryData<BoardBucket[]>(boardKey, [
		bucket(TODO, [card(1, 100), card(2, 200)], {count: 30}),
		bucket(DOING, [card(3, 100)]),
		bucket(DONE, [], {count: 0}),
	])
}

function board(): BoardBucket[] {
	return queryClient.getQueryData<BoardBucket[]>(boardKey) ?? []
}

function cardIds(bucketId: number): (number | undefined)[] {
	return board().find(existing => existing.id === bucketId)?.tasks.map(task => task.id) ?? []
}

function counts(): Record<number, number> {
	return Object.fromEntries(board().map(existing => [existing.id, existing.count]))
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('board queries', () => {
	it('loads the buckets with one page of cards each', async () => {
		sdk.projectViewBucketsTasksList.mockResolvedValue({data: {items: [
			{id: DOING, position: 2, count: 0, tasks: null},
			{id: TODO, position: 1, count: 1, tasks: [card(1, 100)]},
		]}})

		const buckets = await queryClient.fetchQuery(taskBoardQuery(1, 6, {filter: 'done = false', q: ''}))

		expect(sdk.projectViewBucketsTasksList).toHaveBeenCalledWith({
			path: {project: 1, view: 6},
			query: {filter: 'done = false', expand: ['comment_count', 'is_unread'], per_page: 25},
		})
		expect(buckets.map(existing => existing.id)).toEqual([TODO, DOING])
		expect(buckets[1]?.tasks).toEqual([])
	})

	it('loads later pages of a manual bucket by bucket id, in board order', () => {
		expect(bucketPageQuery({filter: 'priority > 2'}, TODO)).toEqual({
			filter: '(priority > 2) && (bucket_id = 10)',
			sort_by: ['position'],
			order_by: ['asc'],
			expand: ['comment_count', 'is_unread'],
			per_page: 25,
		})
	})

	it('loads later pages of a filter bucket with its own filter and search', () => {
		expect(bucketPageQuery({filter: 'priority > 2', q: 'milk'}, 0, {filter: 'done = true', s: 'shop'})).toMatchObject({
			filter: '(priority > 2) && (done = true)',
			q: 'shop',
		})
		expect(bucketPageQuery({}, 1, {filter: ''})).not.toHaveProperty('filter')
	})

	it('starts a bucket at page 2 and marks the cards with their bucket', async () => {
		sdk.projectViewTasksList.mockResolvedValue({data: {items: [card(5, 300)], page: 2, total: 26, total_pages: 2}})
		const query = bucketTasksQuery(1, 6, {}, TODO)

		const pages = await queryClient.fetchInfiniteQuery(query)

		expect(sdk.projectViewTasksList.mock.calls[0]?.[0]).toMatchObject({path: {project: 1, view: 6}, query: {page: 2}})
		expect(pages.pages[0]?.items[0]?.bucket_id).toBe(TODO)
		expect(query.queryKey).toEqual([...boardKey, TODO])
	})

	it('merges later pages without repeating a card', () => {
		const first = bucket(TODO, [card(1, 100), card(2, 200)])
		const pages: InfiniteData<TaskPage> = {
			pages: [{items: [card(2, 200), card(3, 300)], page: 2, per_page: 25, total: 3, total_pages: 2}],
			pageParams: [2],
		}

		expect(mergeBucketTasks(first, pages).map(task => task.id)).toEqual([1, 2, 3])
		expect(mergeBucketTasks(first, undefined)).toBe(first.tasks)
	})

	it('positions a dropped card between its new neighbours', () => {
		const cards = [card(1, 100), card(2, 200), card(3, 300)]

		expect(positionForIndex(cards, 1, 3)).toBe(150)
		expect(positionForIndex(cards, 0, 3)).toBe(50)
		expect(positionForIndex(cards, 2, 1)).toBe(300 + 2 ** 16)
		expect(positionForIndex([], 0)).toBe(0)
	})
})

describe('moving a card', () => {
	beforeEach(seedBoard)

	const move = {projectId: 1, viewId: 6, taskId: 1, fromBucketId: TODO, bucketId: DOING, position: 50}

	it('moves the card before the requests and sets the bucket before the position', async () => {
		sdk.taskBucketUpdate.mockImplementation(async () => {
			expect(cardIds(TODO)).toEqual([2])
			expect(cardIds(DOING)).toEqual([1, 3])
			expect(counts()).toMatchObject({[TODO]: 29, [DOING]: 2})
			return {data: {bucket_id: DOING, task_id: 1, task: card(1, 0)}}
		})
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 50, project_view_id: 6}})

		await run(moveTaskMutationOptions(), move)

		expect(sdk.taskBucketUpdate).toHaveBeenCalledWith({path: {project: 1, view: 6, bucket: DOING}, body: {task_id: 1}})
		expect(sdk.tasksPositionUpdate).toHaveBeenCalledWith({path: {task: 1}, body: {position: 50, project_view_id: 6}})
		expect(sdk.taskBucketUpdate.mock.invocationCallOrder[0]).toBeLessThan(sdk.tasksPositionUpdate.mock.invocationCallOrder[0]!)
		expect(board().find(existing => existing.id === DOING)?.tasks[0]).toMatchObject({id: 1, bucket_id: DOING, position: 50})
	})

	it('only sends the position for a reorder within one bucket', async () => {
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 250, project_view_id: 6}})

		await run(moveTaskMutationOptions(), {...move, bucketId: TODO, position: 250})

		expect(sdk.taskBucketUpdate).not.toHaveBeenCalled()
		expect(cardIds(TODO)).toEqual([2, 1])
		expect(counts()[TODO]).toBe(30)
	})

	it('puts the card back and reloads the board when the target bucket is full', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		const limitReached = {status: 412, code: 10004}
		sdk.taskBucketUpdate.mockRejectedValue(limitReached)

		await expect(run(moveTaskMutationOptions(), move)).rejects.toBe(limitReached)

		expect(sdk.tasksPositionUpdate).not.toHaveBeenCalled()
		expect(cardIds(TODO)).toEqual([1, 2])
		expect(counts()).toMatchObject({[TODO]: 30, [DOING]: 1})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
		expect(message.error).toHaveBeenCalledWith(limitReached)
	})

	it('reloads the board when the position failed after the bucket moved', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.taskBucketUpdate.mockResolvedValue({data: {bucket_id: DOING, task: card(1, 0)}})
		sdk.tasksPositionUpdate.mockRejectedValue({status: 500})

		await expect(run(moveTaskMutationOptions(), move)).rejects.toEqual({status: 500})

		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
	})

	it('follows a repeating task the server sent back to the default bucket', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.taskBucketUpdate.mockResolvedValue({data: {
			bucket_id: TODO,
			task: card(1, 0, {done: false, due_date: '2026-10-01T10:00:00Z'}),
		}})
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 50, project_view_id: 6}})

		await run(moveTaskMutationOptions(), {...move, bucketId: DONE})

		expect(cardIds(DONE)).toEqual([])
		expect(cardIds(TODO)).toContain(1)
		expect(counts()).toMatchObject({[TODO]: 30, [DONE]: 0})
		expect(board()[0]?.tasks.find(task => task.id === 1)).toMatchObject({done: false, due_date: '2026-10-01T10:00:00Z'})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
	})

	it('marks a card done in the done bucket and refreshes the lists filtered by done', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.taskBucketUpdate.mockResolvedValue({data: {bucket_id: DONE, task: card(1, 0, {done: true})}})
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 50, project_view_id: 6}})

		await run(moveTaskMutationOptions(), {...move, bucketId: DONE})

		expect(board()[2]?.tasks[0]).toMatchObject({id: 1, done: true, position: 50})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
		expect(invalidate).not.toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
	})

	it('reloads the board when the server renumbered the positions', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.taskBucketUpdate.mockResolvedValue({data: {bucket_id: DOING, task: card(1, 0)}})
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 65536, project_view_id: 6}})

		await run(moveTaskMutationOptions(), {...move, position: 0.001})

		expect(board()[1]?.tasks.find(task => task.id === 1)?.position).toBe(65536)
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
	})

	it('moves a card that was loaded with "load more"', async () => {
		const pagesKey = taskKeys.bucketTasks(1, 6, {}, TODO)
		queryClient.setQueryData<InfiniteData<TaskPage>>(pagesKey, {
			pages: [{items: [card(40, 900, {bucket_id: TODO})], page: 2, per_page: 25, total: 30, total_pages: 2}],
			pageParams: [2],
		})
		sdk.taskBucketUpdate.mockResolvedValue({data: {bucket_id: DOING, task: card(40, 0)}})
		sdk.tasksPositionUpdate.mockResolvedValue({data: {position: 50, project_view_id: 6}})

		await run(moveTaskMutationOptions(), {...move, taskId: 40})

		expect(queryClient.getQueryData<InfiniteData<TaskPage>>(pagesKey)?.pages[0]?.items).toEqual([])
		expect(cardIds(DOING)).toEqual([40, 3])
	})
})

describe('bucket writes', () => {
	beforeEach(seedBoard)

	it('adds a created bucket to the board', async () => {
		sdk.bucketsCreate.mockResolvedValue({data: {id: 13, title: 'Review', position: 10.5, tasks: null}})

		await run(createBucketMutationOptions(), {projectId: 1, viewId: 6, bucket: {title: 'Review', position: 10.5}})

		expect(sdk.bucketsCreate).toHaveBeenCalledWith({path: {project: 1, view: 6}, body: {title: 'Review', position: 10.5}})
		expect(board().map(existing => existing.id)).toEqual([TODO, 13, DOING, DONE])
		expect(board()[1]).toMatchObject({tasks: [], count: 0})
	})

	it('renames a bucket right away and rolls back when the server refuses', async () => {
		sdk.bucketsUpdate.mockImplementation(async () => {
			expect(board()[0]?.title).toBe('Backlog')
			throw {status: 403}
		})

		await expect(run(renameBucketMutationOptions(), {
			projectId: 1,
			viewId: 6,
			bucket: {id: TODO, title: 'Backlog', limit: 0, position: TODO},
		})).rejects.toEqual({status: 403})

		expect(sdk.bucketsUpdate).toHaveBeenCalledWith({path: {project: 1, view: 6, bucket: TODO}, body: {title: 'Backlog', limit: 0, position: TODO}})
		expect(board()[0]?.title).toBe(`Bucket ${TODO}`)
		expect(board()[0]?.tasks).toHaveLength(2)
	})

	it('keeps the cards when a bucket update succeeds', async () => {
		sdk.bucketsUpdate.mockResolvedValue({data: {id: TODO, title: 'Backlog', limit: 5, position: TODO, tasks: null}})

		await run(renameBucketMutationOptions(), {projectId: 1, viewId: 6, bucket: {id: TODO, title: 'Backlog', limit: 5, position: TODO}})

		expect(board()[0]).toMatchObject({title: 'Backlog', limit: 5, count: 30})
		expect(board()[0]?.tasks).toHaveLength(2)
		expect(message.success).toHaveBeenCalledWith({message: 'The bucket title has been saved successfully.'})
	})

	it('reorders buckets by their new position', async () => {
		sdk.bucketsUpdate.mockResolvedValue({data: {id: DONE, title: 'Done', limit: 0, position: 0.5}})

		await run(renameBucketMutationOptions(), {projectId: 1, viewId: 6, bucket: {id: DONE, title: 'Done', limit: 0, position: 0.5}})

		expect(board().map(existing => existing.id)).toEqual([DONE, TODO, DOING])
	})

	it('drops a deleted bucket and reloads the board its cards moved to', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.bucketsDelete.mockImplementation(async () => {
			expect(board().map(existing => existing.id)).toEqual([TODO, DONE])
			return {data: undefined}
		})

		await run(deleteBucketMutationOptions(), {projectId: 1, viewId: 6, bucketId: DOING})

		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.viewBoards(1, 6)})
		expect(invalidate).toHaveBeenCalledWith({queryKey: projectKeys.detail(1)})
		expect(message.success).toHaveBeenCalledWith({message: 'The bucket has been deleted successfully.'})
	})
})
