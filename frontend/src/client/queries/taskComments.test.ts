import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {InfiniteData, MutationOptions} from '@tanstack/vue-query'

import type {Task, TaskComment} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	taskCommentsCreate: vi.fn(),
	taskCommentsDelete: vi.fn(),
	taskCommentsList: vi.fn(),
	taskCommentsUpdate: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {
	createCommentMutationOptions,
	deleteCommentMutationOptions,
	flattenComments,
	taskCommentKeys,
	taskCommentsQuery,
	updateCommentMutationOptions,
	type CommentPage,
} from './taskComments'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

function comment(id: number, text = `comment ${id}`): TaskComment {
	return {id, comment: text, reactions: {'👍': [{id: 1, username: 'me'}]}}
}

function pages(items: TaskComment[][], totalPages = items.length): InfiniteData<CommentPage, number> {
	const total = items.flat().length
	return {
		pages: items.map((pageItems, index) => ({items: pageItems, page: index + 1, total, total_pages: totalPages})),
		pageParams: items.map((_, index) => index + 1),
	}
}

function cached(order: 'asc' | 'desc' = 'asc') {
	return flattenComments(queryClient.getQueryData(taskCommentKeys.list(5, order)))
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
	queryClient.setQueryData(taskKeys.detail(5), {id: 5, title: 'Task', comment_count: 2} satisfies Task)
})

describe('comment queries', () => {
	it('loads pages in the requested order', async () => {
		sdk.taskCommentsList.mockResolvedValue({data: {items: [comment(1)], page: 1, total: 1, total_pages: 1}})

		await queryClient.fetchInfiniteQuery(taskCommentsQuery(5, 'desc'))

		expect(sdk.taskCommentsList).toHaveBeenCalledWith({path: {task: 5}, query: {page: 1, per_page: 50, order_by: 'desc'}})
	})

	it('lists each comment once although pages shifted', () => {
		expect(flattenComments(pages([[comment(1), comment(2)], [comment(2), comment(3)]])).map(item => item.id)).toEqual([1, 2, 3])
	})
})

describe('comment writes', () => {
	it('appends a new comment to a fully loaded oldest-first list and counts it on the task', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1), comment(2)]]))
		queryClient.setQueryData(taskCommentKeys.list(5, 'desc'), pages([[comment(2), comment(1)]]))
		sdk.taskCommentsCreate.mockResolvedValue({data: comment(3, 'new')})

		await run(createCommentMutationOptions(), {taskId: 5, comment: 'new'})

		expect(sdk.taskCommentsCreate).toHaveBeenCalledWith({path: {task: 5}, body: {comment: 'new'}})
		expect(cached('asc').map(item => item.id)).toEqual([1, 2, 3])
		expect(cached('desc').map(item => item.id)).toEqual([3, 2, 1])
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.comment_count).toBe(3)
		expect(message.success).toHaveBeenCalledWith({message: 'The comment was added successfully.'})
	})

	it('does not append behind pages that are not loaded yet', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1)]], 2))
		sdk.taskCommentsCreate.mockResolvedValue({data: comment(3)})

		await run(createCommentMutationOptions(), {taskId: 5, comment: 'new'})

		expect(cached().map(item => item.id)).toEqual([1])
	})

	it('shows an edit right away and keeps the reactions the response lacks', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1)]]))
		sdk.taskCommentsUpdate.mockImplementation(async () => {
			expect(cached()[0]?.comment).toBe('edited')
			return {data: {id: 1, comment: 'edited', updated: '2026-09-18T10:00:00Z', reactions: null}}
		})

		await run(updateCommentMutationOptions(), {taskId: 5, commentId: 1, comment: 'edited'})

		expect(cached()[0]).toMatchObject({comment: 'edited', updated: '2026-09-18T10:00:00Z', reactions: comment(1).reactions})
	})

	it('rolls an edit back when it fails', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1)]]))
		sdk.taskCommentsUpdate.mockRejectedValue({status: 403})

		await expect(run(updateCommentMutationOptions(), {taskId: 5, commentId: 1, comment: 'edited'})).rejects.toEqual({status: 403})

		expect(cached()[0]?.comment).toBe('comment 1')
	})

	it('removes a deleted comment right away and uncounts it once the server agrees', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1), comment(2)]]))
		sdk.taskCommentsDelete.mockImplementation(async () => {
			expect(cached().map(item => item.id)).toEqual([2])
			expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.comment_count).toBe(2)
			return {data: undefined}
		})

		await run(deleteCommentMutationOptions(), {taskId: 5, commentId: 1})

		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.comment_count).toBe(1)
	})

	it('restores a comment whose delete failed', async () => {
		queryClient.setQueryData(taskCommentKeys.list(5, 'asc'), pages([[comment(1), comment(2)]]))
		sdk.taskCommentsDelete.mockRejectedValue({status: 403})

		await expect(run(deleteCommentMutationOptions(), {taskId: 5, commentId: 1})).rejects.toEqual({status: 403})

		expect(cached().map(item => item.id)).toEqual([1, 2])
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.comment_count).toBe(2)
	})
})
