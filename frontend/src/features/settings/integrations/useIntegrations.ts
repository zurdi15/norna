import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import type {ApiToken, BotUser, Token} from '@/client/generated'
import {apiTokensQuery, tokenRoutesQuery} from '@/client/queries/apiTokens'
import {botsQuery} from '@/client/queries/bots'
import {caldavTokensQuery} from '@/client/queries/caldavTokens'
import {mcpSettingsQuery} from '@/client/queries/mcp'

export type ListedApiToken = ApiToken & {id: number, title: string}
export type ListedCaldavToken = Token & {id: number}
export type ListedBot = BotUser & {id: number, username: string}

/** The user's API tokens, or a bot's when `ownerId` is set. */
export function useApiTokens(ownerId: MaybeRefOrGetter<number> = 0, enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...apiTokensQuery(toValue(ownerId)), enabled: toValue(enabled)})))
	return {
		...query,
		tokens: computed(() => (query.data.value ?? [])
			.filter((token): token is ListedApiToken => typeof token.id === 'number' && typeof token.title === 'string')),
	}
}

export function useTokenRoutes(enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({...tokenRoutesQuery(), enabled: toValue(enabled)})))
	return {...query, routes: computed(() => query.data.value ?? {})}
}

export function useCaldavTokens() {
	const query = useQuery(caldavTokensQuery())
	return {
		...query,
		tokens: computed(() => (query.data.value ?? []).filter((token): token is ListedCaldavToken => typeof token.id === 'number')),
	}
}

export function useBots() {
	const query = useQuery(botsQuery())
	return {
		...query,
		bots: computed(() => (query.data.value ?? [])
			.filter((bot): bot is ListedBot => typeof bot.id === 'number' && typeof bot.username === 'string')),
	}
}

export function useMcpSettings() {
	const query = useQuery(mcpSettingsQuery())
	return {...query, settings: computed(() => query.data.value)}
}
