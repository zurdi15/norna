import {useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {tasksRelationsCreate, tasksRelationsDelete} from '@/client/generated'
import type {Task} from '@/client/generated'
import {
	addRelatedTask,
	inverseRelationKind,
	removeRelatedTask,
	type RelationKind,
} from '@/modules/task/relations'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, invalidateTaskCollections, patchTaskInCaches} from './tasks'

type TaskWithId = Task & {id: number}

// Relations only exist inside tasks; the copies embedded in each other must not nest further.
function embeddedCopy(task: Task): Task {
	const {related_tasks: _related, ...copy} = task
	return copy
}

// Lists expanded with subtasks nest children under their parents, so a subtask relation reshapes them.
function invalidateRelation(client: QueryClient, taskId: number, otherTaskId: number, kind: RelationKind) {
	const reshapesLists = kind === 'subtask' || kind === 'parenttask'
	return Promise.all([
		invalidateTask(client, taskId),
		invalidateTask(client, otherTaskId),
		invalidateTaskCollections(client, reshapesLists ? 'all' : []),
	])
}

export interface CreateRelationInput {
	task: TaskWithId
	otherTask: TaskWithId
	relationKind: RelationKind
}

export function createRelationMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({task, otherTask, relationKind}: CreateRelationInput) => {
			const {data} = await tasksRelationsCreate({
				path: {task: task.id},
				body: {other_task_id: otherTask.id, relation_kind: relationKind},
			})
			return data
		},
		// The api stores the inverse relation on the other task by itself.
		onSuccess: (_relation, {task, otherTask, relationKind}, client) => {
			const other = embeddedCopy(otherTask)
			const base = embeddedCopy(task)
			patchTaskInCaches(client, task.id, existing => ({
				...existing,
				related_tasks: addRelatedTask(existing.related_tasks, relationKind, other),
			}), {embedded: false})
			patchTaskInCaches(client, otherTask.id, existing => ({
				...existing,
				related_tasks: addRelatedTask(existing.related_tasks, inverseRelationKind(relationKind), base),
			}), {embedded: false})
		},
		onSettled: ({task, otherTask, relationKind}, client) =>
			invalidateRelation(client, task.id, otherTask.id, relationKind),
	})
}

export interface DeleteRelationInput {
	taskId: number
	otherTaskId: number
	relationKind: RelationKind
}

export function deleteRelationMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, otherTaskId, relationKind}: DeleteRelationInput) => {
			await tasksRelationsDelete({path: {task: taskId, relationKind, otherTask: otherTaskId}})
		},
		onSuccess: (_data, {taskId, otherTaskId, relationKind}, client) => {
			patchTaskInCaches(client, taskId, existing => ({
				...existing,
				related_tasks: removeRelatedTask(existing.related_tasks, relationKind, otherTaskId),
			}), {embedded: false})
			patchTaskInCaches(client, otherTaskId, existing => ({
				...existing,
				related_tasks: removeRelatedTask(existing.related_tasks, inverseRelationKind(relationKind), taskId),
			}), {embedded: false})
		},
		onSettled: ({taskId, otherTaskId, relationKind}, client) =>
			invalidateRelation(client, taskId, otherTaskId, relationKind),
	})
}

export function useCreateRelationMutation() {
	return useMutation(createRelationMutationOptions())
}

export function useDeleteRelationMutation() {
	return useMutation(deleteRelationMutationOptions())
}
