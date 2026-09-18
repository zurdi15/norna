import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({userDeletionRequest: vi.fn(), userDeletionCancel: vi.fn()}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {cancelAccountDeletionMutationOptions, requestAccountDeletionMutationOptions} from './accountDeletion'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient()
})

describe('account deletion', () => {
	it('requests with the password and keeps no trace of it', async () => {
		const options = requestAccountDeletionMutationOptions()
		expect(options.gcTime).toBe(0)
		sdk.userDeletionRequest.mockResolvedValue({data: {}})
		await client.getMutationCache().build(client, options).execute('secret')
		expect(sdk.userDeletionRequest).toHaveBeenCalledExactlyOnceWith({body: {password: 'secret'}})
		// The page tells where to look next.
		expect(message.success).not.toHaveBeenCalled()
	})

	it('leaves a wrong password to the page', async () => {
		sdk.userDeletionRequest.mockRejectedValue({status: 403, code: 1011})
		await expect(client.getMutationCache().build(client, requestAccountDeletionMutationOptions()).execute('wrong'))
			.rejects.toEqual({status: 403, code: 1011})
		expect(message.error).not.toHaveBeenCalled()
	})

	it('cancels a scheduled deletion', async () => {
		const options = cancelAccountDeletionMutationOptions()
		expect(options.gcTime).toBe(0)
		sdk.userDeletionCancel.mockResolvedValue({data: {}})
		await client.getMutationCache().build(client, options).execute('')
		expect(sdk.userDeletionCancel).toHaveBeenCalledExactlyOnceWith({body: {password: ''}})
		expect(message.success).toHaveBeenCalledOnce()
	})
})
