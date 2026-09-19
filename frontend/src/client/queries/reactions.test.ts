import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {InfiniteData, MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	reactionsCreate: vi.fn(),
	reactionsDelete: vi.fn(),
}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))

import {addReactionMutationOptions, addReactionUser, removeReactionMutationOptions, removeReactionUser} from './reactions'
import {flattenComments, taskCommentKeys, type CommentPage} from './taskComments'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const me = {id: 1, username: 'me'}
const other = {id: 2, username: 'other'}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	queryClient.setQueryData(taskKeys.detail(5), {id: 5, reactions: {'👍': [other]}})
	queryClient.setQueryData<InfiniteData<CommentPage, number>>(taskCommentKeys.list(5, 'asc'), {
		pages: [{items: [{id: 7, comment: 'hi', reactions: {'🎉': [me]}}], page: 1, total: 1, total_pages: 1}],
		pageParams: [1],
	})
})

describe('reaction maps', () => {
	it('adds a user once per reaction', () => {
		expect(addReactionUser({'👍': [other]}, '👍', me)).toEqual({'👍': [other, me]})
		expect(addReactionUser({'👍': [me]}, '👍', me)).toEqual({'👍': [me]})
		expect(addReactionUser(undefined, '🎉', me)).toEqual({'🎉': [me]})
	})

	it('drops a reaction nobody has anymore', () => {
		expect(removeReactionUser({'👍': [me], '🎉': [me, other]}, '👍', 1)).toEqual({'🎉': [me, other]})
	})
})

describe('reaction writes', () => {
	it('adds the reacting user to the task', async () => {
		sdk.reactionsCreate.mockResolvedValue({data: {value: '👍', user: me}})

		await run(addReactionMutationOptions(), {target: {kind: 'tasks', taskId: 5}, value: '👍'})

		expect(sdk.reactionsCreate).toHaveBeenCalledWith({path: {entitykind: 'tasks', entityid: 5}, body: {value: '👍'}})
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.reactions).toEqual({'👍': [other, me]})
	})

	it('removes the user from a comment reaction', async () => {
		sdk.reactionsDelete.mockResolvedValue({data: {}})

		await run(removeReactionMutationOptions(), {target: {kind: 'comments', taskId: 5, commentId: 7}, value: '🎉', userId: 1})

		expect(sdk.reactionsDelete).toHaveBeenCalledWith({path: {entitykind: 'comments', entityid: 7}, body: {value: '🎉'}})
		expect(flattenComments(queryClient.getQueryData(taskCommentKeys.list(5, 'asc')))[0]?.reactions).toEqual({})
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.reactions).toEqual({'👍': [other]})
	})
})
