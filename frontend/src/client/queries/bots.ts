import {queryOptions, useMutation} from '@tanstack/vue-query'

import {botsCreate, botsDelete, botsList, botsUpdate} from '@/client/generated'
import type {BotUser} from '@/client/generated'
import {translate} from '@/i18n'

import {apiTokenKeys} from './apiTokens'
import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

export const botKeys = {
	all: ['bots'] as const,
}

export const BOT_STATUS = {
	active: 0,
	disabled: 2,
} as const

// The server requires it on every bot username.
export const BOT_USERNAME_PREFIX = 'bot-'

export interface BotDraft {
	username: string
	name: string
}

export type UpdateBotInput = Required<Pick<BotUser, 'id' | 'username' | 'name' | 'status'>>

export function createBotDraft(bot: Partial<BotDraft> = {}): BotDraft {
	return {username: '', name: '', ...bot}
}

/** The username as the server wants it: trimmed, with the bot prefix whether or not it was typed. */
export function withBotPrefix(username: string): string {
	const trimmed = username.trim()
	return trimmed.startsWith(BOT_USERNAME_PREFIX) ? trimmed : `${BOT_USERNAME_PREFIX}${trimmed}`
}

export function botsQuery() {
	return queryOptions({
		queryKey: botKeys.all,
		queryFn: ({signal}) => fetchAllPages(async page => (await botsList({query: {page, per_page: 1000}, signal})).data),
	})
}

export function createBotMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({username, name}: BotDraft) => (await botsCreate({body: {
			username: withBotPrefix(username),
			...(name.trim() ? {name: name.trim()} : {}),
		}})).data,
		onSuccess: (created, _draft, client) => {
			client.setQueryData<BotUser[]>(botKeys.all, current => current ? [...current, created] : current)
		},
		onSettled: (_draft, client) => client.invalidateQueries({queryKey: botKeys.all}),
		successMessage: () => translate('settingsIntegrations.bots.created'),
	})
}

export function updateBotMutationOptions() {
	return contextMutationOptions({
		// The body replaces all three fields: status 0 re-enables and an empty name clears it.
		mutationFn: async ({id, username, name, status}: UpdateBotInput) => (await botsUpdate({
			path: {bot: id},
			body: {username: withBotPrefix(username), name: name.trim(), status},
		})).data,
		optimistic: {
			queryKeys: () => [botKeys.all],
			update: ({id, username, name, status}, client) => {
				client.setQueryData<BotUser[]>(botKeys.all, current => current?.map(bot => bot.id === id
					? {...bot, username: withBotPrefix(username), name: name.trim(), status}
					: bot))
			},
		},
		onSuccess: (updated, {id}, client) => {
			client.setQueryData<BotUser[]>(botKeys.all, current => current?.map(bot => bot.id === id ? {...bot, ...updated} : bot))
		},
		onSettled: (_input, client) => client.invalidateQueries({queryKey: botKeys.all}),
		successMessage: () => translate('settings.saved'),
	})
}

export function deleteBotMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			await botsDelete({path: {bot: id}})
		},
		onSuccess: (_data, id, client) => {
			client.setQueryData<BotUser[]>(botKeys.all, current => current?.filter(bot => bot.id !== id))
			// Its tokens went with it.
			client.removeQueries({queryKey: apiTokenKeys.list(id)})
		},
		onSettled: (_id, client) => client.invalidateQueries({queryKey: botKeys.all}),
		successMessage: () => translate('settingsIntegrations.bots.deleted'),
	})
}

export const useCreateBotMutation = () => useMutation(createBotMutationOptions())
export const useUpdateBotMutation = () => useMutation(updateBotMutationOptions())
export const useDeleteBotMutation = () => useMutation(deleteBotMutationOptions())
