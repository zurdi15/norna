import {infiniteQueryOptions, useMutation} from '@tanstack/vue-query'
import type {InfiniteData, QueryClient} from '@tanstack/vue-query'

import {
	taskCommentsCreate,
	taskCommentsDelete,
	taskCommentsList,
	taskCommentsUpdate,
} from '@/client/generated'
import type {PaginatedTaskComment, TaskComment} from '@/client/generated'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, invalidateTaskCollections, patchTaskInCaches} from './tasks'

export type CommentOrder = 'asc' | 'desc'

export interface CommentPage {
	items: TaskComment[]
	page: number
	total: number
	total_pages: number
}

export const COMMENTS_PER_PAGE = 50

// Not under ['tasks']: comments are not task-shaped, and the task cache walker must never see them.
export const taskCommentKeys = {
	all: ['task-comments'] as const,
	task: (taskId: number) => ['task-comments', taskId] as const,
	list: (taskId: number, order: CommentOrder) => ['task-comments', taskId, order] as const,
}

function toCommentPage(data: PaginatedTaskComment): CommentPage {
	return {
		items: data.items ?? [],
		page: data.page ?? 1,
		total: data.total ?? 0,
		total_pages: data.total_pages ?? 1,
	}
}

function nextCommentPage(last: CommentPage): number | undefined {
	return last.page < last.total_pages ? last.page + 1 : undefined
}

export function taskCommentsQuery(taskId: number, order: CommentOrder = 'asc') {
	return infiniteQueryOptions({
		queryKey: taskCommentKeys.list(taskId, order),
		queryFn: async ({pageParam}) => toCommentPage((await taskCommentsList({
			path: {task: taskId},
			query: {page: pageParam, per_page: COMMENTS_PER_PAGE, order_by: order},
		})).data),
		initialPageParam: 1,
		getNextPageParam: nextCommentPage,
		enabled: taskId > 0,
	})
}

/** All loaded comments in order, once each: a comment added meanwhile shifts later pages by one. */
export function flattenComments(data: InfiniteData<CommentPage> | undefined): TaskComment[] {
	const seen = new Set<number | undefined>()
	return (data?.pages ?? []).flatMap(page => page.items).filter(comment => {
		if (seen.has(comment.id)) {
			return false
		}
		seen.add(comment.id)
		return true
	})
}

type CommentPages = InfiniteData<CommentPage, number>

function editCommentPages(
	client: QueryClient,
	taskId: number,
	edit: (pages: CommentPages, order: CommentOrder) => CommentPages,
) {
	for (const [queryKey, data] of client.getQueriesData<CommentPages>({queryKey: taskCommentKeys.task(taskId)})) {
		if (data) {
			client.setQueryData<CommentPages>(queryKey, edit(data, queryKey[2] as CommentOrder))
		}
	}
}

function mapComments(pages: CommentPages, map: (comments: TaskComment[]) => TaskComment[]): CommentPages {
	return {...pages, pages: pages.pages.map(page => ({...page, items: map(page.items)}))}
}

/** Updates one comment wherever it is loaded. Only for mutation callbacks. */
export function patchCommentInCaches(
	client: QueryClient,
	taskId: number,
	commentId: number,
	change: (comment: TaskComment) => TaskComment,
) {
	editCommentPages(client, taskId, pages => mapComments(pages, comments =>
		comments.map(comment => comment.id === commentId ? change(comment) : comment),
	))
}

function insertComment(pages: CommentPages, order: CommentOrder, comment: TaskComment): CommentPages {
	const count = pages.pages.length
	const last = pages.pages[count - 1]
	const withTotal = pages.pages.map(page => ({...page, total: page.total + 1}))
	if (order === 'desc') {
		const [first, ...rest] = withTotal
		return first ? {...pages, pages: [{...first, items: [comment, ...first.items]}, ...rest]} : pages
	}
	// Oldest first: the comment belongs after the last page, which is only on screen once everything is loaded.
	if (!last || nextCommentPage(last) !== undefined) {
		return {...pages, pages: withTotal}
	}
	return {
		...pages,
		pages: withTotal.map((page, index) => index === count - 1 ? {...page, items: [...page.items, comment]} : page),
	}
}

function adjustCommentCount(client: QueryClient, taskId: number, delta: number) {
	patchTaskInCaches(client, taskId, task => typeof task.comment_count === 'number'
		? {...task, comment_count: Math.max(0, task.comment_count + delta)}
		: task,
	)
}

function invalidateComments(client: QueryClient, taskId: number) {
	return Promise.all([
		client.invalidateQueries({queryKey: taskCommentKeys.task(taskId)}),
		invalidateTask(client, taskId),
		invalidateTaskCollections(client, []),
	])
}

export interface CreateCommentInput {
	taskId: number
	comment: string
}

export function createCommentMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, comment}: CreateCommentInput) => {
			const {data} = await taskCommentsCreate({path: {task: taskId}, body: {comment}})
			return data
		},
		onSuccess: (created, {taskId}, client) => {
			editCommentPages(client, taskId, (pages, order) => insertComment(pages, order, created))
			adjustCommentCount(client, taskId, 1)
		},
		onSettled: ({taskId}, client) => invalidateComments(client, taskId),
	})
}

export interface UpdateCommentInput {
	taskId: number
	commentId: number
	comment: string
}

export function updateCommentMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, commentId, comment}: UpdateCommentInput) => {
			const {data} = await taskCommentsUpdate({path: {task: taskId, commentid: commentId}, body: {comment}})
			return data
		},
		optimistic: {
			queryKeys: ({taskId}) => [taskCommentKeys.task(taskId)],
			update: ({taskId, commentId, comment}, client) => {
				patchCommentInCaches(client, taskId, commentId, existing => ({...existing, comment}))
			},
		},
		onSuccess: (updated, {taskId, commentId}, client) => {
			// The write response carries no reactions, so only the edited fields are taken from it.
			patchCommentInCaches(client, taskId, commentId, existing => ({
				...existing,
				comment: updated.comment ?? existing.comment,
				updated: updated.updated ?? existing.updated,
			}))
		},
		onSettled: ({taskId}, client) => client.invalidateQueries({queryKey: taskCommentKeys.task(taskId)}),
	})
}

export interface DeleteCommentInput {
	taskId: number
	commentId: number
}

export function deleteCommentMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, commentId}: DeleteCommentInput) => {
			await taskCommentsDelete({path: {task: taskId, commentid: commentId}})
		},
		optimistic: {
			queryKeys: ({taskId}) => [taskCommentKeys.task(taskId)],
			update: ({taskId, commentId}, client) => {
				editCommentPages(client, taskId, pages => ({
					...pages,
					pages: pages.pages.map(page => ({
						...page,
						items: page.items.filter(comment => comment.id !== commentId),
						total: Math.max(0, page.total - 1),
					})),
				}))
			},
		},
		onSuccess: (_data, {taskId}, client) => adjustCommentCount(client, taskId, -1),
		onSettled: ({taskId}, client) => invalidateComments(client, taskId),
	})
}

export function useCreateCommentMutation() {
	return useMutation(createCommentMutationOptions())
}

export function useUpdateCommentMutation() {
	return useMutation(updateCommentMutationOptions())
}

export function useDeleteCommentMutation() {
	return useMutation(deleteCommentMutationOptions())
}
