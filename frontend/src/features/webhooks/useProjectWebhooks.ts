import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import type {Webhook} from '@/client/generated'
import {projectWebhooksQuery, webhookEventsQuery} from '@/client/queries/projectWebhooks'

export type ProjectWebhook = Webhook & {id: number, target_url: string, events: string[]}

export function useProjectWebhooks(projectId: MaybeRefOrGetter<number>, enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({
		...projectWebhooksQuery(toValue(projectId)),
		enabled: toValue(enabled) && toValue(projectId) > 0,
	})))
	return {
		...query,
		webhooks: computed(() => (query.data.value ?? []).filter((webhook): webhook is ProjectWebhook =>
			typeof webhook.id === 'number' && typeof webhook.target_url === 'string' && Array.isArray(webhook.events))),
	}
}

export function useWebhookEvents(enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...webhookEventsQuery(), enabled: toValue(enabled)})))
	return {...query, events: computed(() => query.data.value ?? [])}
}
