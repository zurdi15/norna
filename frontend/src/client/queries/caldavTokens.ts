import {queryOptions, useMutation} from '@tanstack/vue-query'

import {caldavTokensCreate, caldavTokensDelete, caldavTokensList} from '@/client/generated'
import type {Token} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

export const caldavTokenKeys = {
	all: ['caldav-tokens'] as const,
}

// The cleartext token only comes in the create response: the cache keeps what describes it.
function toCaldavToken({id, created}: Token): Token {
	return {id, created}
}

export function caldavTokensQuery() {
	return queryOptions({
		queryKey: caldavTokenKeys.all,
		queryFn: async ({signal}) => (await fetchAllPages(async page =>
			(await caldavTokensList({query: {page, per_page: 1000}, signal})).data)).map(toCaldavToken),
	})
}

export function createCaldavTokenMutationOptions() {
	return {
		...contextMutationOptions<Token, void>({
			// Resolves with the cleartext token for the caller to show once.
			mutationFn: async () => (await caldavTokensCreate()).data,
			onSuccess: (created, _input, client) => {
				client.setQueryData<Token[]>(caldavTokenKeys.all, current => current ? [...current, toCaldavToken(created)] : current)
			},
			onSettled: (_input, client) => client.invalidateQueries({queryKey: caldavTokenKeys.all}),
		}),
		// The result holds the cleartext token: callers read it and reset() right away.
		gcTime: 0,
	}
}

export function deleteCaldavTokenMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			await caldavTokensDelete({path: {id}})
		},
		onSuccess: (_data, id, client) => {
			client.setQueryData<Token[]>(caldavTokenKeys.all, current => current?.filter(token => token.id !== id))
		},
		onSettled: (_id, client) => client.invalidateQueries({queryKey: caldavTokenKeys.all}),
		successMessage: () => translate('settingsIntegrations.tokens.deleted'),
	})
}

export const useCreateCaldavTokenMutation = () => useMutation(createCaldavTokenMutationOptions())
export const useDeleteCaldavTokenMutation = () => useMutation(deleteCaldavTokenMutationOptions())
