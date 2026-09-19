import {queryOptions, useMutation, type QueryClient} from '@tanstack/vue-query'

import {sessionsDelete, sessionsList} from '@/client/generated'
import type {Session} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

export type UserSession = Required<Pick<Session, 'id'>> & Pick<Session, 'device_info' | 'ip_address' | 'last_active' | 'created'>

export const sessionKeys = {
	all: ['sessions'] as const,
}

// Listing never returns the refresh token, but only these fields may reach the cache anyway.
function toSession({id, device_info, ip_address, last_active, created}: Session): UserSession {
	return {id: id ?? '', device_info, ip_address, last_active, created}
}

/** The account's signed-in sessions, most recently active first. */
export function sessionsQuery() {
	return queryOptions({
		queryKey: sessionKeys.all,
		queryFn: async ({signal}) => (await fetchAllPages(async page =>
			(await sessionsList({query: {page, per_page: 1000}, signal})).data)).map(toSession),
	})
}

function removeSessions(client: QueryClient, ids: readonly string[]) {
	client.setQueryData<UserSession[]>(sessionKeys.all, current => current?.filter(session => !ids.includes(session.id)))
}

export function revokeSessionMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: string) => {
			await sessionsDelete({path: {session: id}})
		},
		optimistic: {
			queryKeys: () => [sessionKeys.all],
			update: (id, client) => removeSessions(client, [id]),
		},
		onSettled: (_id, client) => client.invalidateQueries({queryKey: sessionKeys.all}),
		successMessage: () => translate('settingsAccount.sessions.revoked'),
	})
}

/**
 * Signs out several sessions. The API revokes one at a time, and in turn: parallel
 * deletes trip over each other on SQLite. One that fails doesn't stop the rest.
 */
export function revokeSessionsMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (ids: readonly string[]) => {
			let failure: {cause: unknown} | null = null
			for (const id of ids) {
				try {
					await sessionsDelete({path: {session: id}})
				} catch (cause) {
					failure ??= {cause}
				}
			}
			if (failure) {
				throw failure.cause
			}
		},
		optimistic: {
			queryKeys: () => [sessionKeys.all],
			update: (ids, client) => removeSessions(client, ids),
		},
		onSettled: (_ids, client) => client.invalidateQueries({queryKey: sessionKeys.all}),
		successMessage: (_data, ids) => translate('settingsAccount.sessions.revokedMany', ids.length),
	})
}

export const useRevokeSessionMutation = () => useMutation(revokeSessionMutationOptions())
export const useRevokeSessionsMutation = () => useMutation(revokeSessionsMutationOptions())
