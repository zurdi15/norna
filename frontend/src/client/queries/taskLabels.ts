import {useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {taskLabelsBulkReplace, taskLabelsCreate, taskLabelsDelete} from '@/client/generated'
import type {Label} from '@/client/generated'
import {i18n} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, invalidateTaskCollections, patchTaskInCaches} from './tasks'

type LabelWithId = Label & {id: number}

// Labels only exist inside tasks, and filters can select by them.
function settle(client: QueryClient, taskId: number) {
	return Promise.all([
		invalidateTask(client, taskId),
		invalidateTaskCollections(client, ['labels']),
	])
}

export interface TaskLabelInput {
	taskId: number
	label: LabelWithId
}

export function addTaskLabelMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, label}: TaskLabelInput) => {
			const {data} = await taskLabelsCreate({path: {task: taskId}, body: {label_id: label.id}})
			return data
		},
		onSuccess: (_labelTask, {taskId, label}, client) => {
			patchTaskInCaches(client, taskId, task => ({
				...task,
				labels: [...(task.labels ?? []).filter(existing => existing.id !== label.id), label],
			}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
		successMessage: () => i18n.global.t('task.label.addSuccess'),
	})
}

export function removeTaskLabelMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, label}: TaskLabelInput) => {
			await taskLabelsDelete({path: {task: taskId, label: label.id}})
		},
		onSuccess: (_data, {taskId, label}, client) => {
			patchTaskInCaches(client, taskId, task => ({
				...task,
				labels: (task.labels ?? []).filter(existing => existing.id !== label.id),
			}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
		successMessage: () => i18n.global.t('task.label.removeSuccess'),
	})
}

export interface ReplaceTaskLabelsInput {
	taskId: number
	labels: LabelWithId[]
}

export function replaceTaskLabelsMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, labels}: ReplaceTaskLabelsInput) => {
			const {data} = await taskLabelsBulkReplace({path: {task: taskId}, body: {labels}})
			return data.labels ?? labels
		},
		onSuccess: (labels, {taskId}, client) => {
			patchTaskInCaches(client, taskId, task => ({...task, labels}))
		},
		onSettled: ({taskId}, client) => settle(client, taskId),
	})
}

export function useAddTaskLabelMutation() {
	return useMutation(addTaskLabelMutationOptions())
}

export function useRemoveTaskLabelMutation() {
	return useMutation(removeTaskLabelMutationOptions())
}

export function useReplaceTaskLabelsMutation() {
	return useMutation(replaceTaskLabelsMutationOptions())
}
