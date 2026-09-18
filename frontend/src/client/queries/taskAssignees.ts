import {useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {taskAssigneesBulk, taskAssigneesCreate, taskAssigneesDelete} from '@/client/generated'
import type {User} from '@/client/generated'
import {i18n} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, invalidateTaskCollections, patchTaskInCaches} from './tasks'

type UserWithId = User & {id: number}

// Assignees only exist inside tasks, and filters can select by them.
function settle(client: QueryClient, taskId: number) {
	return Promise.all([
		invalidateTask(client, taskId),
		invalidateTaskCollections(client, ['assignees']),
	])
}

export interface AssigneeInput {
	taskId: number
	user: UserWithId
}

export function addAssigneeMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, user}: AssigneeInput) => {
			const {data} = await taskAssigneesCreate({path: {task: taskId}, body: {user_id: user.id}})
			return data
		},
		onSuccess: (_assignee, {taskId, user}, client) => {
			patchTaskInCaches(client, taskId, task => ({
				...task,
				assignees: [...(task.assignees ?? []).filter(existing => existing.id !== user.id), user],
			}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
		successMessage: () => i18n.global.t('task.assignee.assignSuccess'),
	})
}

export function removeAssigneeMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, user}: AssigneeInput) => {
			await taskAssigneesDelete({path: {task: taskId, user: user.id}})
		},
		onSuccess: (_data, {taskId, user}, client) => {
			patchTaskInCaches(client, taskId, task => ({
				...task,
				assignees: (task.assignees ?? []).filter(existing => existing.id !== user.id),
			}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
		successMessage: () => i18n.global.t('task.assignee.unassignSuccess'),
	})
}

export interface ReplaceAssigneesInput {
	taskId: number
	users: UserWithId[]
}

export function replaceAssigneesMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, users}: ReplaceAssigneesInput) => {
			const {data} = await taskAssigneesBulk({path: {task: taskId}, body: {assignees: users}})
			return data.assignees ?? users
		},
		onSuccess: (assignees, {taskId}, client) => {
			patchTaskInCaches(client, taskId, task => ({...task, assignees}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
	})
}

export function useAddAssigneeMutation() {
	return useMutation(addAssigneeMutationOptions())
}

export function useRemoveAssigneeMutation() {
	return useMutation(removeAssigneeMutationOptions())
}

export function useReplaceAssigneesMutation() {
	return useMutation(replaceAssigneesMutationOptions())
}
