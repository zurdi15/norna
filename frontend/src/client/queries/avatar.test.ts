import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({userGetAvatarProvider: vi.fn(), userSetAvatarProvider: vi.fn(), userAvatarUpload: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {avatarKeys, avatarProviderQuery, setAvatarProviderMutationOptions, uploadAvatarMutationOptions} from './avatar'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('avatar', () => {
	it('reads the provider, falling back to the default one', async () => {
		sdk.userGetAvatarProvider.mockResolvedValueOnce({data: {avatar_provider: 'marble'}})
		expect(await client.fetchQuery(avatarProviderQuery())).toBe('marble')

		const other = new QueryClient()
		sdk.userGetAvatarProvider.mockResolvedValueOnce({data: {}})
		expect(await other.fetchQuery(avatarProviderQuery())).toBe('default')
	})

	it('switches the provider at once and puts it back when the save fails', async () => {
		client.setQueryData(avatarKeys.provider, 'initials')
		let settle: (value: unknown) => void = () => {}
		sdk.userSetAvatarProvider.mockReturnValue(new Promise((_resolve, reject) => settle = reject))

		const running = client.getMutationCache().build(client, setAvatarProviderMutationOptions()).execute('gravatar')
		await vi.waitFor(() => expect(client.getQueryData(avatarKeys.provider)).toBe('gravatar'))
		expect(sdk.userSetAvatarProvider).toHaveBeenCalledExactlyOnceWith({body: {avatar_provider: 'gravatar'}})

		settle({status: 400})
		await expect(running).rejects.toEqual({status: 400})
		expect(client.getQueryData(avatarKeys.provider)).toBe('initials')
	})

	it('uploads the image and marks the provider as upload', async () => {
		client.setQueryData(avatarKeys.provider, 'initials')
		sdk.userAvatarUpload.mockResolvedValue({data: {}})
		const image = new Blob(['png'], {type: 'image/png'})
		await client.getMutationCache().build(client, uploadAvatarMutationOptions()).execute(image)
		expect(sdk.userAvatarUpload).toHaveBeenCalledExactlyOnceWith({body: {avatar: image}})
		expect(client.getQueryData(avatarKeys.provider)).toBe('upload')
		expect(client.getQueryState(avatarKeys.provider)?.isInvalidated).toBe(true)
	})
})
