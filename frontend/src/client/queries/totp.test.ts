import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({totpGet: vi.fn(), totpQrcode: vi.fn(), totpEnroll: vi.fn(), totpEnable: vi.fn(), totpDisable: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {error} from '@/message'

import {
	disableTotpMutationOptions,
	enableTotpMutationOptions,
	enrollTotpMutationOptions,
	toTotpStatus,
	totpKeys,
	totpStatusQuery,
} from './totp'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

const PENDING = {enabled: false, secret: 'JDI45DPJ', url: 'otpauth://totp/Norna:ana?secret=JDI45DPJ'}

describe('totp', () => {
	it('tells off, pending and on apart', () => {
		expect(toTotpStatus({enabled: true})).toEqual({state: 'on'})
		expect(toTotpStatus(PENDING)).toEqual({state: 'pending', secret: 'JDI45DPJ', url: PENDING.url})
		expect(toTotpStatus({enabled: false})).toEqual({state: 'off'})
	})

	it('reads "never enrolled" as off and rethrows anything else', async () => {
		sdk.totpGet.mockRejectedValueOnce({status: 412, code: 1016})
		expect(await client.fetchQuery(totpStatusQuery())).toEqual({state: 'off'})

		const other = new QueryClient({defaultOptions: {queries: {retry: false}}})
		sdk.totpGet.mockRejectedValueOnce({status: 500})
		await expect(other.fetchQuery(totpStatusQuery())).rejects.toEqual({status: 500})
	})

	it('keeps the secret out of the cache once nothing uses it', () => {
		expect(totpStatusQuery().gcTime).toBe(0)
		expect(enrollTotpMutationOptions().gcTime).toBe(0)
	})

	it('enrolls into the pending state and drops an old qr code', async () => {
		client.setQueryData(totpKeys.qrCode, new Blob(['old']))
		sdk.totpEnroll.mockResolvedValue({data: PENDING})
		await client.getMutationCache().build(client, enrollTotpMutationOptions()).execute()
		expect(client.getQueryData(totpKeys.status)).toEqual({state: 'pending', secret: 'JDI45DPJ', url: PENDING.url})
		expect(client.getQueryData(totpKeys.qrCode)).toBeUndefined()
	})

	it('sends the passcode without spaces and leaves a wrong one to the form', async () => {
		sdk.totpEnable.mockResolvedValueOnce({data: {}})
		await client.getMutationCache().build(client, enableTotpMutationOptions()).execute('123 456')
		expect(sdk.totpEnable).toHaveBeenCalledExactlyOnceWith({body: {passcode: '123456'}})
		expect(client.getQueryData(totpKeys.status)).toEqual({state: 'on'})

		sdk.totpEnable.mockRejectedValueOnce({status: 412, code: 1017})
		await expect(client.getMutationCache().build(client, enableTotpMutationOptions()).execute('000000')).rejects.toEqual({status: 412, code: 1017})
		expect(error).not.toHaveBeenCalled()
	})

	it('turns off with the password and forgets it', async () => {
		client.setQueryData(totpKeys.status, {state: 'on'})
		sdk.totpDisable.mockResolvedValue({data: {}})
		const options = disableTotpMutationOptions()
		expect(options.gcTime).toBe(0)
		await client.getMutationCache().build(client, options).execute('secret')
		expect(sdk.totpDisable).toHaveBeenCalledExactlyOnceWith({body: {password: 'secret'}})
		expect(client.getQueryData(totpKeys.status)).toEqual({state: 'off'})
	})
})
