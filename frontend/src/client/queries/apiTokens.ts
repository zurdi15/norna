import {queryOptions, useMutation} from '@tanstack/vue-query'

import {tokenRoutes, tokensCreate, tokensDelete, tokensList} from '@/client/generated'
import type {ApiToken, RouteDetail} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

/** What a token may do, by resource: `{tasks: ['create', 'read_all']}`. */
export type TokenPermissions = Record<string, string[]>

export const apiTokenKeys = {
	all: ['api-tokens'] as const,
	// Owner 0 is the user themselves; a bot's id lists that bot's tokens.
	list: (ownerId = 0) => ['api-tokens', ownerId] as const,
	routes: ['api-token-routes'] as const,
}

export interface ApiTokenDraft {
	title: string
	expiresAt: Date
	permissions: TokenPermissions
	// A bot the user owns; the user themselves when left out.
	ownerId?: number
}

export function normalizePermissions(permissions: ApiToken['permissions']): TokenPermissions {
	return Object.fromEntries(Object.entries(permissions ?? {})
		.filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0))
}

// The cleartext token only ever comes in the create response: nothing that reaches a cache keeps it.
function toApiToken({id, title, permissions, expires_at, created, owner_id}: ApiToken): ApiToken {
	return {id, title, permissions: normalizePermissions(permissions), expires_at, created, owner_id}
}

export function apiTokensQuery(ownerId = 0) {
	return queryOptions({
		queryKey: apiTokenKeys.list(ownerId),
		queryFn: async ({signal}) => (await fetchAllPages(async page => (await tokensList({
			query: {page, per_page: 1000, ...(ownerId ? {owner_id: ownerId} : {})},
			signal,
		})).data)).map(toApiToken),
	})
}

/** The permissions a token can be scoped to, alphabetical with the catch-all "other" group last. */
export function normalizeTokenRoutes(routes: Record<string, Record<string, RouteDetail>> | null | undefined): TokenPermissions {
	return Object.fromEntries(Object.entries(routes ?? {})
		.map(([group, permissions]) => [group, Object.keys(permissions ?? {}).sort()] as const)
		.filter(([, permissions]) => permissions.length > 0)
		.sort(([a], [b]) => Number(a === 'other') - Number(b === 'other') || a.localeCompare(b)))
}

export function tokenRoutesQuery() {
	return queryOptions({
		queryKey: apiTokenKeys.routes,
		queryFn: async ({signal}) => normalizeTokenRoutes((await tokenRoutes({signal})).data),
		// Fixed by the server build.
		staleTime: Infinity,
	})
}

export function createApiTokenMutationOptions() {
	return {
		...contextMutationOptions({
			// Resolves with the cleartext token for the caller to show once.
			mutationFn: async ({title, expiresAt, permissions, ownerId}: ApiTokenDraft) => (await tokensCreate({body: {
				title: title.trim(),
				expires_at: expiresAt.toISOString(),
				permissions,
				...(ownerId ? {owner_id: ownerId} : {}),
			}})).data,
			onSuccess: (created, {ownerId}, client) => {
				client.setQueryData<ApiToken[]>(apiTokenKeys.list(ownerId), current => current ? [...current, toApiToken(created)] : current)
			},
			onSettled: ({ownerId}, client) => client.invalidateQueries({queryKey: apiTokenKeys.list(ownerId)}),
		}),
		// The result holds the cleartext token: callers read it and reset() right away.
		gcTime: 0,
	}
}

export function deleteApiTokenMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id}: {id: number, ownerId?: number}) => {
			await tokensDelete({path: {id}})
		},
		onSuccess: (_data, {id, ownerId}, client) => {
			client.setQueryData<ApiToken[]>(apiTokenKeys.list(ownerId), current => current?.filter(token => token.id !== id))
		},
		onSettled: ({ownerId}, client) => client.invalidateQueries({queryKey: apiTokenKeys.list(ownerId)}),
		successMessage: () => translate('settingsIntegrations.tokens.deleted'),
	})
}

export const useCreateApiTokenMutation = () => useMutation(createApiTokenMutationOptions())
export const useDeleteApiTokenMutation = () => useMutation(deleteApiTokenMutationOptions())
