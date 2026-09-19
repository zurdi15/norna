import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({userExportStatus: vi.fn(), userExportRequest: vi.fn(), userExportDownload: vi.fn()}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))
const download = vi.hoisted(() => ({downloadBlob: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)
vi.mock('@/helpers/downloadBlob', () => download)
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {
	dataExportFileName,
	dataExportQuery,
	downloadDataExportMutationOptions,
	isDataExportPending,
	requestDataExportMutationOptions,
	toDataExport,
} from './dataExport'

const status = {id: 7, size: 2048, created: '2026-09-18T10:00:00Z', expires: '2026-09-25T10:00:00Z'}

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
	window.URL.createObjectURL = vi.fn(() => 'blob:export')
})

describe('data export', () => {
	it('reads the current export, or none', async () => {
		sdk.userExportStatus.mockResolvedValueOnce({data: status})
		expect(await client.fetchQuery(dataExportQuery())).toEqual({
			id: 7,
			size: 2048,
			created: new Date('2026-09-18T10:00:00Z'),
			expires: new Date('2026-09-25T10:00:00Z'),
		})
		expect(toDataExport(null)).toBeNull()
		expect(toDataExport({id: 0})).toBeNull()
	})

	it('is pending until an export other than the previous one shows up', () => {
		const current = toDataExport(status)
		expect(isDataExportPending(current, null)).toBe(false)
		expect(isDataExportPending(current, {previousId: 7, at: 0})).toBe(true)
		expect(isDataExportPending(current, {previousId: 6, at: 0})).toBe(false)
		expect(isDataExportPending(null, {previousId: null, at: 0})).toBe(true)
		expect(isDataExportPending(current, {previousId: null, at: 0})).toBe(false)
	})

	it('names the file after the day it was made', () => {
		expect(dataExportFileName({created: new Date(2026, 0, 5, 23, 30)})).toBe('norna-export-2026-01-05.zip')
	})

	it('requests with the password, which stays out of the cache and the toasts', async () => {
		const options = requestDataExportMutationOptions()
		expect(options.gcTime).toBe(0)
		sdk.userExportRequest.mockResolvedValue({data: {}})
		await client.getMutationCache().build(client, options).execute('secret')
		expect(sdk.userExportRequest).toHaveBeenCalledExactlyOnceWith({body: {password: 'secret'}})
		expect(message.success).toHaveBeenCalledOnce()

		sdk.userExportRequest.mockRejectedValue({status: 403, code: 1011})
		await expect(client.getMutationCache().build(client, requestDataExportMutationOptions()).execute('wrong')).rejects.toEqual({status: 403, code: 1011})
		expect(message.error).not.toHaveBeenCalled()
	})

	it('downloads the zip as a blob', async () => {
		sdk.userExportDownload.mockResolvedValue({data: new Blob(['zip'])})
		const options = downloadDataExportMutationOptions()
		expect(options.gcTime).toBe(0)
		await client.getMutationCache().build(client, options).execute({password: 'secret', fileName: 'norna-export-2026-09-18.zip'})
		expect(sdk.userExportDownload).toHaveBeenCalledExactlyOnceWith({body: {password: 'secret'}, parseAs: 'blob'})
		expect(download.downloadBlob).toHaveBeenCalledWith('blob:export', 'norna-export-2026-09-18.zip')
	})

	it('fails when no file comes back', async () => {
		sdk.userExportDownload.mockResolvedValue({data: null})
		await expect(client.getMutationCache().build(client, downloadDataExportMutationOptions()).execute({password: '', fileName: 'x.zip'}))
			.rejects.toThrow('Did not get the export file')
		expect(download.downloadBlob).not.toHaveBeenCalled()
	})
})
