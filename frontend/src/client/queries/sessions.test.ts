import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({sessionsList: vi.fn(), sessionsDelete: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {error, success} from '@/message'

import {revokeSessionMutationOptions, revokeSessionsMutationOptions, sessionKeys, sessionsQuery} from './sessions'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

const session = (id: string) => ({id, device_info: 'Firefox', ip_address: '127.0.0.1', last_active: '2026-09-18T10:00:00Z'})

describe('sessions', () => {
	it('loads every page and keeps refresh tokens out of the cache', async () => {
		sdk.sessionsList
			.mockResolvedValueOnce({data: {items: [{...session('a'), refresh_token: 'leak'}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [session('b')], total_pages: 2}})
		const sessions = await client.fetchQuery(sessionsQuery())
		expect(sdk.sessionsList).toHaveBeenNthCalledWith(2, {query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(sessions.map(({id}) => id)).toEqual(['a', 'b'])
		expect(JSON.stringify(sessions)).not.toContain('leak')
	})

	it('removes a revoked session right away', async () => {
		client.setQueryData(sessionKeys.all, [session('a'), session('b')])
		sdk.sessionsDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, revokeSessionMutationOptions()).execute('a')
		expect(sdk.sessionsDelete).toHaveBeenCalledExactlyOnceWith({path: {session: 'a'}})
		expect(client.getQueryData(sessionKeys.all)).toEqual([session('b')])
		expect(client.getQueryState(sessionKeys.all)?.isInvalidated).toBe(true)
	})

	it('revokes several one after another and reports a failure after trying all', async () => {
		client.setQueryData(sessionKeys.all, [session('a'), session('b'), session('c'), session('d')])
		let running = 0
		let overlapped = false
		sdk.sessionsDelete.mockImplementation(async ({path}: {path: {session: string}}) => {
			overlapped ||= running > 0
			running++
			await Promise.resolve()
			running--
			if (path.session === 'c') {
				throw {status: 500}
			}
			return {}
		})

		await expect(client.getMutationCache().build(client, revokeSessionsMutationOptions()).execute(['b', 'c', 'd'])).rejects.toEqual({status: 500})
		expect(sdk.sessionsDelete.mock.calls.map(([{path}]) => path.session)).toEqual(['b', 'c', 'd'])
		expect(overlapped).toBe(false)
		expect(error).toHaveBeenCalledOnce()
		// The list refetches to show which ones really went.
		expect(client.getQueryState(sessionKeys.all)?.isInvalidated).toBe(true)
	})

	it('counts the signed out devices in the toast', async () => {
		sdk.sessionsDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, revokeSessionsMutationOptions()).execute(['a', 'b'])
		expect(success).toHaveBeenCalledExactlyOnceWith({message: 'Signed out of 2 devices'})
	})
})
