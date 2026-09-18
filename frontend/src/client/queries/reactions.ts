import {useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {reactionsCreate, reactionsDelete} from '@/client/generated'
import type {Task, User} from '@/client/generated'

import {contextMutationOptions} from './contextMutation'
import {patchCommentInCaches, taskCommentKeys} from './taskComments'
import {invalidateTask, patchTaskInCaches} from './tasks'

export type ReactionMap = NonNullable<Task['reactions']>

/** Reactions are embedded in their task (detail) or comment, so they have no query of their own. */
export type ReactionTarget =
	| {kind: 'tasks', taskId: number}
	| {kind: 'comments', taskId: number, commentId: number}

export interface ReactionInput {
	target: ReactionTarget
	value: string
}

export interface RemoveReactionInput extends ReactionInput {
	userId: number
}

export function addReactionUser(reactions: ReactionMap | undefined, value: string, user: User): ReactionMap {
	const users = (reactions?.[value] ?? []).filter(existing => existing.id !== user.id)
	return {...reactions, [value]: [...users, user]}
}

export function removeReactionUser(reactions: ReactionMap | undefined, value: string, userId: number): ReactionMap {
	const next: ReactionMap = {...reactions}
	const users = (reactions?.[value] ?? []).filter(existing => existing.id !== userId)
	if (users.length > 0) {
		next[value] = users
	} else {
		delete next[value]
	}
	return next
}

function entityPath(target: ReactionTarget) {
	return {
		entitykind: target.kind,
		entityid: target.kind === 'tasks' ? target.taskId : target.commentId,
	}
}

function patchReactions(client: QueryClient, target: ReactionTarget, update: (reactions: ReactionMap | undefined) => ReactionMap) {
	if (target.kind === 'tasks') {
		patchTaskInCaches(client, target.taskId, task => ({...task, reactions: update(task.reactions)}))
		return
	}
	patchCommentInCaches(client, target.taskId, target.commentId, comment => ({...comment, reactions: update(comment.reactions)}))
}

function invalidateTarget(client: QueryClient, target: ReactionTarget) {
	return target.kind === 'tasks'
		? invalidateTask(client, target.taskId)
		: client.invalidateQueries({queryKey: taskCommentKeys.task(target.taskId)})
}

export function addReactionMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({target, value}: ReactionInput) => {
			const {data} = await reactionsCreate({path: entityPath(target), body: {value}})
			return data
		},
		onSuccess: (reaction, {target, value}, client) => {
			const user = reaction.user
			if (user) {
				patchReactions(client, target, reactions => addReactionUser(reactions, value, user))
			}
		},
		onSettled: ({target}, client) => invalidateTarget(client, target),
	})
}

export function removeReactionMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({target, value}: RemoveReactionInput) => {
			await reactionsDelete({path: entityPath(target), body: {value}})
		},
		onSuccess: (_data, {target, value, userId}, client) => {
			patchReactions(client, target, reactions => removeReactionUser(reactions, value, userId))
		},
		onSettled: ({target}, client) => invalidateTarget(client, target),
	})
}

export function useAddReactionMutation() {
	return useMutation(addReactionMutationOptions())
}

export function useRemoveReactionMutation() {
	return useMutation(removeReactionMutationOptions())
}
