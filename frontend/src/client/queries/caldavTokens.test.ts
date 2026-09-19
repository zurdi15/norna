import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({caldavTokensList: vi.fn(), caldavTokensCreate: vi.fn(), caldavTokensDelete: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {caldavTokenKeys, caldavTokensQuery, createCaldavTokenMutationOptions, deleteCaldavTokenMutationOptions} from './caldavTokens'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('caldav tokens', () => {
	it('loads every page and keeps only the id and the creation date', async () => {
		sdk.caldavTokensList
			.mockResolvedValueOnce({data: {items: [{id: 1, created: '2026-09-01T00:00:00Z', token: 'leak'}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [{id: 2}], total_pages: 2}})
		expect(await client.fetchQuery(caldavTokensQuery())).toEqual([
			{id: 1, created: '2026-09-01T00:00:00Z'},
			{id: 2, created: undefined},
		])
		expect(sdk.caldavTokensList).toHaveBeenLastCalledWith({query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
	})

	it('hands the new token back once and caches only what describes it', async () => {
		client.setQueryData(caldavTokenKeys.all, [{id: 1}])
		sdk.caldavTokensCreate.mockResolvedValue({data: {id: 2, created: '2026-09-18T00:00:00Z', token: 'secret-value'}})
		const options = createCaldavTokenMutationOptions()
		expect(options.gcTime).toBe(0)
		const created = await client.getMutationCache().build(client, options).execute()
		expect(created.token).toBe('secret-value')
		expect(client.getQueryData(caldavTokenKeys.all)).toEqual([{id: 1}, {id: 2, created: '2026-09-18T00:00:00Z'}])
		expect(client.getQueryState(caldavTokenKeys.all)?.isInvalidated).toBe(true)
	})

	it('removes only the deleted token', async () => {
		client.setQueryData(caldavTokenKeys.all, [{id: 1}, {id: 2}])
		sdk.caldavTokensDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, deleteCaldavTokenMutationOptions()).execute(1)
		expect(sdk.caldavTokensDelete).toHaveBeenCalledExactlyOnceWith({path: {id: 1}})
		expect(client.getQueryData(caldavTokenKeys.all)).toEqual([{id: 2}])
	})
})
