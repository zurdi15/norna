import {queryOptions, useMutation} from '@tanstack/vue-query'

import {userWebhooksCreate, userWebhooksDelete, userWebhooksEvents, userWebhooksList, userWebhooksUpdate} from '@/client/generated'
import type {Webhook} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'
import {toWebhook, webhookBody, type WebhookDraft} from './projectWebhooks'

export const userWebhookKeys = {
	list: ['user-webhooks'] as const,
	events: ['user-webhook-events'] as const,
}

// The author is always the user themselves: nothing worth showing.
function toUserWebhook(webhook: Webhook): Webhook {
	return {...toWebhook(webhook), created_by: undefined}
}

export function userWebhooksQuery() {
	return queryOptions({
		queryKey: userWebhookKeys.list,
		queryFn: async ({signal}) => (await fetchAllPages(async page =>
			(await userWebhooksList({query: {page, per_page: 1000}, signal})).data)).map(toUserWebhook),
	})
}

/** The events a user webhook can listen to: the ones aimed at a single user (reminders, overdue tasks). */
export function userWebhookEventsQuery() {
	return queryOptions({
		queryKey: userWebhookKeys.events,
		queryFn: async ({signal}) => [...(await userWebhooksEvents({signal})).data ?? []].sort(),
		// Fixed by the server build.
		staleTime: Infinity,
	})
}

export function createUserWebhookMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (webhook: WebhookDraft) => toUserWebhook((await userWebhooksCreate({body: webhookBody(webhook)})).data),
			onSuccess: (created, _webhook, client) => {
				client.setQueryData<Webhook[]>(userWebhookKeys.list, current => current ? [...current, created] : current)
			},
			onSettled: (_webhook, client) => client.invalidateQueries({queryKey: userWebhookKeys.list}),
			successMessage: () => translate('projectWebhooks.created'),
		}),
		// Input holds the signing secret and the basic-auth password.
		gcTime: 0,
	}
}

export function updateUserWebhookMutationOptions() {
	return contextMutationOptions({
		// Only the events change, but the body is validated whole, so the url goes along.
		mutationFn: async ({id, target_url, events}: {id: number, target_url: string, events: string[]}) =>
			toUserWebhook((await userWebhooksUpdate({path: {webhook: id}, body: {target_url, events}})).data),
		onSuccess: (updated, {id, events}, client) => {
			client.setQueryData<Webhook[]>(userWebhookKeys.list, current =>
				current?.map(webhook => webhook.id === id ? {...webhook, events: updated.events ?? events} : webhook))
		},
		onSettled: (_input, client) => client.invalidateQueries({queryKey: userWebhookKeys.list}),
		successMessage: () => translate('projectWebhooks.updated'),
	})
}

export function deleteUserWebhookMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			await userWebhooksDelete({path: {webhook: id}})
		},
		onSuccess: (_data, id, client) => {
			client.setQueryData<Webhook[]>(userWebhookKeys.list, current => current?.filter(webhook => webhook.id !== id))
		},
		onSettled: (_id, client) => client.invalidateQueries({queryKey: userWebhookKeys.list}),
		successMessage: () => translate('projectWebhooks.deleted'),
	})
}

export const useCreateUserWebhookMutation = () => useMutation(createUserWebhookMutationOptions())
export const useUpdateUserWebhookMutation = () => useMutation(updateUserWebhookMutationOptions())
export const useDeleteUserWebhookMutation = () => useMutation(deleteUserWebhookMutationOptions())
