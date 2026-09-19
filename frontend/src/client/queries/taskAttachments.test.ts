import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	patchTasksRead: vi.fn(),
	taskAttachmentsDelete: vi.fn(),
	taskAttachmentsDownload: vi.fn(),
	taskAttachmentsUpload: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))
const download = vi.hoisted(() => ({downloadBlob: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)
vi.mock('@/helpers/downloadBlob', () => download)

import {
	clearAttachmentBlobCache,
	deleteAttachmentMutationOptions,
	downloadAttachment,
	fetchAttachmentBlobUrl,
	setCoverImageMutationOptions,
	uploadAttachmentsMutationOptions,
} from './taskAttachments'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const existing = {id: 1, task_id: 5, file: {name: 'a.png'}}

function cachedTask() {
	return queryClient.getQueryData<Task>(taskKeys.detail(5))
}

beforeEach(() => {
	queryClient.clear()
	clearAttachmentBlobCache()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
	download.downloadBlob.mockReset()
	window.URL.createObjectURL = vi.fn(() => 'blob:attachment')
	window.URL.revokeObjectURL = vi.fn()
	queryClient.setQueryData(taskKeys.detail(5), {id: 5, title: 'Task', attachments: [existing], cover_image_attachment_id: 1} satisfies Task)
})

describe('attachment blobs', () => {
	it('downloads a preview once as a blob and shares the url', async () => {
		sdk.taskAttachmentsDownload.mockResolvedValue({data: new Blob(['png'], {type: 'image/png'})})

		const urls = await Promise.all([
			fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1}, 'md'),
			fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1}, 'md'),
		])

		expect(urls).toEqual(['blob:attachment', 'blob:attachment'])
		expect(sdk.taskAttachmentsDownload).toHaveBeenCalledExactlyOnceWith({
			path: {task: 5, attachment: 1},
			query: {preview_size: 'md'},
			parseAs: 'blob',
		})
	})

	it('caches each preview size separately', async () => {
		sdk.taskAttachmentsDownload.mockResolvedValue({data: new Blob(['png'])})

		await fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1})
		await fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1}, 'lg')

		expect(sdk.taskAttachmentsDownload).toHaveBeenCalledTimes(2)
		expect(sdk.taskAttachmentsDownload.mock.calls[0]?.[0].query).toBeUndefined()
	})

	it('retries after a failed download', async () => {
		sdk.taskAttachmentsDownload.mockRejectedValueOnce({status: 404}).mockResolvedValueOnce({data: new Blob(['png'])})

		await expect(fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1})).rejects.toEqual({status: 404})
		await expect(fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1})).resolves.toBe('blob:attachment')
	})

	it('rejects a response without a blob', async () => {
		sdk.taskAttachmentsDownload.mockResolvedValue({data: null})

		await expect(fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1})).rejects.toThrow('Did not get a blob')
	})

	it('revokes cached urls when cleared', async () => {
		sdk.taskAttachmentsDownload.mockResolvedValue({data: new Blob(['png'])})
		await fetchAttachmentBlobUrl({taskId: 5, attachmentId: 1})

		clearAttachmentBlobCache()

		expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment')
	})

	it('saves the original file under its name', async () => {
		sdk.taskAttachmentsDownload.mockResolvedValue({data: new Blob(['png'])})

		await downloadAttachment(existing)

		expect(download.downloadBlob).toHaveBeenCalledWith('blob:attachment', 'a.png')
	})
})

describe('attachment writes', () => {
	it('uploads every file in one request and adds them to the task', async () => {
		const uploaded = {id: 2, task_id: 5, file: {name: 'b.png'}}
		sdk.taskAttachmentsUpload.mockResolvedValue({data: {success: [uploaded], errors: null}})
		const file = new File(['b'], 'b.png')

		const result = await run(uploadAttachmentsMutationOptions(), {taskId: 5, files: [file]})

		expect(sdk.taskAttachmentsUpload).toHaveBeenCalledWith({path: {task: 5}, body: {files: [file]}})
		expect(result).toEqual({uploaded: [uploaded], errors: []})
		expect(cachedTask()?.attachments).toEqual([existing, uploaded])
		expect(message.error).not.toHaveBeenCalled()
	})

	it('keeps the files that went through and reports the rejected ones', async () => {
		const uploaded = {id: 2, task_id: 5}
		sdk.taskAttachmentsUpload.mockResolvedValue({data: {success: [uploaded], errors: [{code: 4013, message: 'file too large'}]}})

		const result = await run(uploadAttachmentsMutationOptions(), {taskId: 5, files: [new File(['b'], 'b.png'), new File(['c'], 'c.iso')]})

		expect(result.errors).toHaveLength(1)
		expect(cachedTask()?.attachments).toContainEqual(uploaded)
		expect(message.error).toHaveBeenCalledWith(new Error('file too large'))
	})

	it('fails when no file went through', async () => {
		sdk.taskAttachmentsUpload.mockResolvedValue({data: {success: null, errors: [{message: 'file too large'}]}})

		await expect(run(uploadAttachmentsMutationOptions(), {taskId: 5, files: [new File(['c'], 'c.iso')]})).rejects.toThrow('file too large')

		expect(cachedTask()?.attachments).toEqual([existing])
	})

	it('removes a deleted attachment and the cover it was', async () => {
		sdk.taskAttachmentsDelete.mockResolvedValue({data: undefined})

		await run(deleteAttachmentMutationOptions(), {taskId: 5, attachmentId: 1})

		expect(sdk.taskAttachmentsDelete).toHaveBeenCalledWith({path: {task: 5, attachment: 1}})
		expect(cachedTask()).toMatchObject({attachments: [], cover_image_attachment_id: 0})
	})

	it('sets the cover image through a task patch', async () => {
		sdk.patchTasksRead.mockResolvedValue({data: {id: 5, cover_image_attachment_id: 0}, response: {status: 200}})

		await run(setCoverImageMutationOptions(), {taskId: 5, attachmentId: null})

		expect(sdk.patchTasksRead.mock.calls[0]?.[0].body).toEqual([{op: 'replace', path: '/cover_image_attachment_id', value: 0}])
		expect(cachedTask()?.cover_image_attachment_id).toBe(0)
		expect(message.success).toHaveBeenCalledWith({message: 'The cover image was successfully changed.'})
	})
})
