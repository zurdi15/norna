import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import type {Webhook} from '@/client/generated'
import {projectWebhooksQuery, webhookEventsQuery} from '@/client/queries/projectWebhooks'
import {userWebhookEventsQuery, userWebhooksQuery} from '@/client/queries/userWebhooks'

export type ListedWebhook = Webhook & {id: number, target_url: string, events: string[]}

function listed(webhooks: Webhook[] | undefined): ListedWebhook[] {
	return (webhooks ?? []).filter((webhook): webhook is ListedWebhook =>
		typeof webhook.id === 'number' && typeof webhook.target_url === 'string' && Array.isArray(webhook.events))
}

export function useProjectWebhooks(projectId: MaybeRefOrGetter<number>, enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({
		...projectWebhooksQuery(toValue(projectId)),
		enabled: toValue(enabled) && toValue(projectId) > 0,
	})))
	return {...query, webhooks: computed(() => listed(query.data.value))}
}

/** The user's own webhooks: reminders and overdue tasks from all their projects. */
export function useUserWebhooks(enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...userWebhooksQuery(), enabled: toValue(enabled)})))
	return {...query, webhooks: computed(() => listed(query.data.value))}
}

export function useWebhookEvents(enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...webhookEventsQuery(), enabled: toValue(enabled)})))
	return {...query, events: computed(() => query.data.value ?? [])}
}

export function useUserWebhookEvents(enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...userWebhookEventsQuery(), enabled: toValue(enabled)})))
	return {...query, events: computed(() => query.data.value ?? [])}
}
