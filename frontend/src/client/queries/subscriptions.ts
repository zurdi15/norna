import {useMutation} from '@tanstack/vue-query'

import {subscriptionsCreate, subscriptionsDelete} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, patchTaskInCaches} from './tasks'

// Project subscriptions live in projects.ts (setProjectSubscriptionMutationOptions).

export interface TaskSubscriptionInput {
	taskId: number
	subscribed: boolean
}

export function setTaskSubscriptionMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, subscribed}: TaskSubscriptionInput) => {
			const path = {entity: 'task', entityID: taskId} as const
			if (!subscribed) {
				await subscriptionsDelete({path})
				return undefined
			}
			const {data} = await subscriptionsCreate({path})
			return data
		},
		// Unsubscribing from a task inherited from its project records an opt-out; the detail refetch shows it.
		onSuccess: (subscription, {taskId}, client) => {
			patchTaskInCaches(client, taskId, task => ({...task, subscription}))
		},
		onSettled: ({taskId}, client) => invalidateTask(client, taskId),
		successMessage: (_subscription, {subscribed}) => translate(subscribed
			? 'task.subscription.subscribeSuccessTask'
			: 'task.subscription.unsubscribeSuccessTask'),
	})
}

export function useSetTaskSubscriptionMutation() {
	return useMutation(setTaskSubscriptionMutationOptions())
}
