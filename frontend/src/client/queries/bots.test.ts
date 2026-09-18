import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({botsList: vi.fn(), botsCreate: vi.fn(), botsUpdate: vi.fn(), botsDelete: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {apiTokenKeys} from './apiTokens'
import {
	BOT_STATUS,
	botKeys,
	botsQuery,
	createBotMutationOptions,
	deleteBotMutationOptions,
	updateBotMutationOptions,
	withBotPrefix,
} from './bots'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('bots', () => {
	it('adds the bot- prefix only when it is missing', () => {
		expect(withBotPrefix(' helper ')).toBe('bot-helper')
		expect(withBotPrefix('bot-helper')).toBe('bot-helper')
	})

	it('loads every page of the user\'s bots', async () => {
		sdk.botsList
			.mockResolvedValueOnce({data: {items: [{id: 1, username: 'bot-a'}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [{id: 2, username: 'bot-b'}], total_pages: 2}})
		expect((await client.fetchQuery(botsQuery())).map(bot => bot.id)).toEqual([1, 2])
		expect(sdk.botsList).toHaveBeenLastCalledWith({query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
	})

	it('creates with the prefix and leaves out an empty name', async () => {
		client.setQueryData(botKeys.all, [])
		sdk.botsCreate.mockResolvedValue({data: {id: 3, username: 'bot-helper'}})
		await client.getMutationCache().build(client, createBotMutationOptions()).execute({username: 'helper', name: '  '})
		expect(sdk.botsCreate).toHaveBeenCalledExactlyOnceWith({body: {username: 'bot-helper'}})
		expect(client.getQueryData(botKeys.all)).toEqual([{id: 3, username: 'bot-helper'}])

		await client.getMutationCache().build(client, createBotMutationOptions()).execute({username: 'bot-x', name: ' Helper '})
		expect(sdk.botsCreate).toHaveBeenLastCalledWith({body: {username: 'bot-x', name: 'Helper'}})
	})

	it('sends every field on update, shows it right away and rolls back when it fails', async () => {
		const bots = [{id: 1, username: 'bot-a', name: 'A', status: BOT_STATUS.active}, {id: 2, username: 'bot-b', name: 'B', status: BOT_STATUS.active}]
		client.setQueryData(botKeys.all, bots)
		let reject: (cause: Error) => void = () => {}
		sdk.botsUpdate.mockReturnValue(new Promise((_resolve, fail) => reject = fail))
		const running = client.getMutationCache().build(client, updateBotMutationOptions())
			.execute({id: 1, username: 'bot-a', name: 'A', status: BOT_STATUS.disabled})
		await vi.waitFor(() => expect(sdk.botsUpdate).toHaveBeenCalled())
		expect(sdk.botsUpdate).toHaveBeenCalledWith({path: {bot: 1}, body: {username: 'bot-a', name: 'A', status: BOT_STATUS.disabled}})
		expect(client.getQueryData<typeof bots>(botKeys.all)?.[0]?.status).toBe(BOT_STATUS.disabled)
		reject(new Error('nope'))
		await expect(running).rejects.toThrow('nope')
		expect(client.getQueryData(botKeys.all)).toEqual(bots)
	})

	it('deletes the bot and forgets its tokens', async () => {
		client.setQueryData(botKeys.all, [{id: 1}, {id: 2}])
		client.setQueryData(apiTokenKeys.list(1), [{id: 10}])
		client.setQueryData(apiTokenKeys.list(), [{id: 11}])
		sdk.botsDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, deleteBotMutationOptions()).execute(1)
		expect(sdk.botsDelete).toHaveBeenCalledExactlyOnceWith({path: {bot: 1}})
		expect(client.getQueryData(botKeys.all)).toEqual([{id: 2}])
		expect(client.getQueryData(apiTokenKeys.list(1))).toBeUndefined()
		expect(client.getQueryData(apiTokenKeys.list())).toEqual([{id: 11}])
	})
})
