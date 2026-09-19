import {queryOptions, useMutation, type QueryClient} from '@tanstack/vue-query'

import {webhooksCreate, webhooksDelete, webhooksEventsList, webhooksList, webhooksUpdate} from '@/client/generated'
import type {Webhook, WebhookWritable} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

export const projectWebhookKeys = {
	list: (projectId: number) => ['project-webhooks', projectId] as const,
	events: ['webhook-events'] as const,
}

export interface WebhookDraft {
	target_url: string
	events: string[]
	secret: string
	basic_auth_user: string
	basic_auth_password: string
}

export function createWebhookDraft(): WebhookDraft {
	return {target_url: '', events: [], secret: '', basic_auth_user: '', basic_auth_password: ''}
}

// The API masks the write-only credentials, but only these fields ever reach a cache.
export function toWebhook({id, target_url, events, project_id, created_by, created, updated}: Webhook): Webhook {
	return {id, target_url, events: events ?? [], project_id, created_by, created, updated}
}

// The server only sends the Basic Auth header when both halves are set.
export function webhookBody({target_url, events, secret, basic_auth_user, basic_auth_password}: WebhookDraft): WebhookWritable {
	return {
		target_url: target_url.trim(),
		events,
		...(secret ? {secret} : {}),
		...(basic_auth_user && basic_auth_password ? {basic_auth_user, basic_auth_password} : {}),
	}
}

export function projectWebhooksQuery(projectId: number) {
	return queryOptions({
		queryKey: projectWebhookKeys.list(projectId),
		queryFn: async ({signal}) => (await fetchAllPages(async page =>
			(await webhooksList({path: {project: projectId}, query: {page, per_page: 1000}, signal})).data)).map(toWebhook),
	})
}

export function webhookEventsQuery() {
	return queryOptions({
		queryKey: projectWebhookKeys.events,
		queryFn: async ({signal}) => [...(await webhooksEventsList({signal})).data ?? []].sort(),
		// Fixed by the server build.
		staleTime: Infinity,
	})
}

function invalidateWebhooks(client: QueryClient, projectId: number) {
	return client.invalidateQueries({queryKey: projectWebhookKeys.list(projectId)})
}

export function createProjectWebhookMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({projectId, webhook}: {projectId: number, webhook: WebhookDraft}) =>
			toWebhook((await webhooksCreate({path: {project: projectId}, body: webhookBody(webhook)})).data),
		onSuccess: (created, {projectId}, client) => {
			client.setQueryData<Webhook[]>(projectWebhookKeys.list(projectId), current => current ? [...current, created] : current)
		},
		onSettled: ({projectId}, client) => invalidateWebhooks(client, projectId),
		successMessage: () => translate('projectWebhooks.created'),
		// Input holds the signing secret and the basic-auth password.
		gcTime: 0,
	})
}

type UpdateWebhookInput = {projectId: number, id: number, target_url: string, events: string[]}

export function updateProjectWebhookMutationOptions() {
	return contextMutationOptions({
		// Only the events change, but the body is validated whole, so the url goes along.
		mutationFn: async ({projectId, id, target_url, events}: UpdateWebhookInput) =>
			toWebhook((await webhooksUpdate({path: {project: projectId, webhook: id}, body: {target_url, events}})).data),
		onSuccess: (updated, {projectId, id, events}, client) => {
			client.setQueryData<Webhook[]>(projectWebhookKeys.list(projectId), current =>
				current?.map(webhook => webhook.id === id ? {...webhook, events: updated.events ?? events} : webhook))
		},
		onSettled: ({projectId}, client) => invalidateWebhooks(client, projectId),
		successMessage: () => translate('projectWebhooks.updated'),
	})
}

export function deleteProjectWebhookMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({projectId, id}: {projectId: number, id: number}) => {
			await webhooksDelete({path: {project: projectId, webhook: id}})
		},
		onSuccess: (_data, {projectId, id}, client) => {
			client.setQueryData<Webhook[]>(projectWebhookKeys.list(projectId), current => current?.filter(webhook => webhook.id !== id))
		},
		onSettled: ({projectId}, client) => invalidateWebhooks(client, projectId),
		successMessage: () => translate('projectWebhooks.deleted'),
	})
}

export const useCreateProjectWebhookMutation = () => useMutation(createProjectWebhookMutationOptions())
export const useUpdateProjectWebhookMutation = () => useMutation(updateProjectWebhookMutationOptions())
export const useDeleteProjectWebhookMutation = () => useMutation(deleteProjectWebhookMutationOptions())
