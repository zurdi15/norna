import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({tokensList: vi.fn(), tokensCreate: vi.fn(), tokensDelete: vi.fn(), tokenRoutes: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {
	apiTokenKeys,
	apiTokensQuery,
	createApiTokenMutationOptions,
	deleteApiTokenMutationOptions,
	normalizeTokenRoutes,
	tokenRoutesQuery,
} from './apiTokens'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('api tokens', () => {
	it('loads every page of the user\'s tokens without any cleartext token', async () => {
		sdk.tokensList
			.mockResolvedValueOnce({data: {items: [{id: 1, title: 'a', token: 'tk_leak', permissions: {tasks: ['create'], labels: null}}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [{id: 2, title: 'b', permissions: null}], total_pages: 2}})
		const tokens = await client.fetchQuery(apiTokensQuery())
		expect(sdk.tokensList).toHaveBeenNthCalledWith(1, {query: {page: 1, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(sdk.tokensList).toHaveBeenNthCalledWith(2, {query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(tokens.map(token => [token.id, token.permissions])).toEqual([[1, {tasks: ['create']}], [2, {}]])
		expect(JSON.stringify(tokens)).not.toContain('tk_leak')
	})

	it('asks for a bot\'s tokens by its id, in a list of their own', async () => {
		sdk.tokensList.mockResolvedValueOnce({data: {items: [], total_pages: 1}})
		await client.fetchQuery(apiTokensQuery(9))
		expect(sdk.tokensList).toHaveBeenCalledWith({query: {page: 1, per_page: 1000, owner_id: 9}, signal: expect.any(AbortSignal)})
		expect(client.getQueryData(apiTokenKeys.list(9))).toEqual([])
		expect(client.getQueryData(apiTokenKeys.list())).toBeUndefined()
	})

	it('sorts the routes by group, "other" last, and drops empty groups', async () => {
		expect(normalizeTokenRoutes({
			tasks: {update: {}, create: {}},
			other: {user: {}},
			caldav: {access: {}},
			empty: {},
		})).toEqual({caldav: ['access'], tasks: ['create', 'update'], other: ['user']})
		expect(Object.keys(normalizeTokenRoutes({other: {a: {}}, zeta: {a: {}}, alpha: {a: {}}}))).toEqual(['alpha', 'zeta', 'other'])
		expect(normalizeTokenRoutes(null)).toEqual({})

		sdk.tokenRoutes.mockResolvedValueOnce({data: {labels: {read_all: {}}}})
		expect(await client.fetchQuery(tokenRoutesQuery())).toEqual({labels: ['read_all']})
	})

	it('hands the cleartext token back once, keeps it out of the query cache and lets the mutation go right away', async () => {
		client.setQueryData(apiTokenKeys.list(), [])
		client.setQueryData(apiTokenKeys.list(9), [])
		sdk.tokensCreate.mockResolvedValue({data: {id: 5, title: 'Home', token: 'tk_secret', permissions: {tasks: ['create']}, expires_at: '2026-10-18T12:00:00Z'}})
		const options = createApiTokenMutationOptions()
		expect(options.gcTime).toBe(0)

		const created = await client.getMutationCache().build(client, options).execute({
			title: ' Home ',
			expiresAt: new Date('2026-10-18T12:00:00Z'),
			permissions: {tasks: ['create']},
		})
		expect(created.token).toBe('tk_secret')
		expect(sdk.tokensCreate).toHaveBeenCalledExactlyOnceWith({body: {title: 'Home', expires_at: '2026-10-18T12:00:00.000Z', permissions: {tasks: ['create']}}})
		expect(client.getQueryData(apiTokenKeys.list())).toEqual([
			{id: 5, title: 'Home', permissions: {tasks: ['create']}, expires_at: '2026-10-18T12:00:00Z', created: undefined, owner_id: undefined},
		])
		expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.state.data))).not.toContain('tk_secret')
		expect(client.getQueryState(apiTokenKeys.list())?.isInvalidated).toBe(true)
		expect(client.getQueryState(apiTokenKeys.list(9))?.isInvalidated).toBe(false)
	})

	it('creates a bot\'s token with its owner id', async () => {
		sdk.tokensCreate.mockResolvedValue({data: {id: 6, token: 'tk_bot'}})
		client.setQueryData(apiTokenKeys.list(9), [])
		await client.getMutationCache().build(client, createApiTokenMutationOptions()).execute({
			title: 'bot', expiresAt: new Date('2027-01-01T00:00:00Z'), permissions: {tasks: ['read_all']}, ownerId: 9,
		})
		expect(sdk.tokensCreate.mock.calls[0]?.[0].body.owner_id).toBe(9)
		expect(client.getQueryData<{id: number}[]>(apiTokenKeys.list(9))?.map(token => token.id)).toEqual([6])
	})

	it('removes only the deleted token, from its owner\'s list', async () => {
		client.setQueryData(apiTokenKeys.list(), [{id: 1}, {id: 2}])
		client.setQueryData(apiTokenKeys.list(9), [{id: 3}])
		sdk.tokensDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, deleteApiTokenMutationOptions()).execute({id: 3, ownerId: 9})
		expect(sdk.tokensDelete).toHaveBeenCalledExactlyOnceWith({path: {id: 3}})
		expect(client.getQueryData(apiTokenKeys.list(9))).toEqual([])
		expect(client.getQueryData(apiTokenKeys.list())).toEqual([{id: 1}, {id: 2}])
	})
})
