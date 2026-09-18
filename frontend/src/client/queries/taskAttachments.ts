import {useMutation} from '@tanstack/vue-query'

import {
	taskAttachmentsDelete,
	taskAttachmentsDownload,
	taskAttachmentsUpload,
} from '@/client/generated'
import type {AttachmentUploadError, TaskAttachment} from '@/client/generated'
import {downloadBlob} from '@/helpers/downloadBlob'
import {i18n} from '@/i18n'
import {error} from '@/message'

import {contextMutationOptions} from './contextMutation'
import {invalidateTask, invalidateTaskCollections, patchTaskInCaches, taskPatchMutationOptions} from './tasks'

export type AttachmentPreviewSize = 'sm' | 'md' | 'lg' | 'xl'

type AttachmentRef = {taskId: number, attachmentId: number}

async function fetchAttachmentBlob({taskId, attachmentId}: AttachmentRef, size?: AttachmentPreviewSize): Promise<Blob> {
	const {data} = await taskAttachmentsDownload({
		path: {task: taskId, attachment: attachmentId},
		query: size ? {preview_size: size} : undefined,
		parseAs: 'blob',
	})
	// Firefox hands back null instead of an empty blob when the response has no body.
	if (!(data instanceof Blob)) {
		throw new Error(`Did not get a blob for attachment ${attachmentId} of task ${taskId}`)
	}
	return data
}

function toObjectUrl(blob: Blob): Promise<string> {
	// SVGs render more reliably from a data url. FileReader is missing in some webviews (iOS Lockdown Mode).
	if (blob.type === 'image/svg+xml' && typeof FileReader !== 'undefined') {
		return new Promise(resolve => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = () => resolve(window.URL.createObjectURL(blob))
			reader.readAsDataURL(blob)
		})
	}
	return Promise.resolve(window.URL.createObjectURL(blob))
}

const blobUrlCache = new Map<string, string>()
const pendingBlobUrls = new Map<string, Promise<string>>()

/**
 * An object url for an attachment (or its preview), fetched once and shared by
 * every consumer. Callers must not revoke it; use clearAttachmentBlobCache().
 */
export function fetchAttachmentBlobUrl(attachment: AttachmentRef, size?: AttachmentPreviewSize): Promise<string> {
	const key = `${attachment.taskId}-${attachment.attachmentId}-${size ?? ''}`
	const cached = blobUrlCache.get(key)
	if (cached !== undefined) {
		return Promise.resolve(cached)
	}
	const pending = pendingBlobUrls.get(key)
	if (pending !== undefined) {
		return pending
	}

	const request = fetchAttachmentBlob(attachment, size)
		.then(toObjectUrl)
		.then(url => {
			blobUrlCache.set(key, url)
			pendingBlobUrls.delete(key)
			return url
		})
		.catch(cause => {
			// Drop the rejected promise, else every retry rethrows it.
			pendingBlobUrls.delete(key)
			throw cause
		})
	pendingBlobUrls.set(key, request)
	return request
}

export function clearAttachmentBlobCache() {
	blobUrlCache.forEach(url => window.URL.revokeObjectURL(url))
	blobUrlCache.clear()
	pendingBlobUrls.clear()
}

/** Saves the original file. Uses its own object url, since downloadBlob revokes the one it gets. */
export async function downloadAttachment(attachment: TaskAttachment): Promise<void> {
	if (typeof attachment.id !== 'number' || typeof attachment.task_id !== 'number') {
		throw new Error('Cannot download an attachment without an id')
	}
	const blob = await fetchAttachmentBlob({taskId: attachment.task_id, attachmentId: attachment.id})
	downloadBlob(window.URL.createObjectURL(blob), attachment.file?.name ?? `attachment-${attachment.id}`)
}

export function uploadErrorMessage(errors: readonly AttachmentUploadError[]): string {
	return errors.map(uploadError => uploadError.message).filter(Boolean).join('\n')
}

export interface UploadAttachmentsInput {
	taskId: number
	files: File[] | FileList
}

export interface UploadAttachmentsResult {
	uploaded: TaskAttachment[]
	/** Files the server rejected while others went through (the request still answers 201). */
	errors: AttachmentUploadError[]
}

// The generated client uses fetch, so no upload progress is available.
export function uploadAttachmentsMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, files}: UploadAttachmentsInput): Promise<UploadAttachmentsResult> => {
			const {data} = await taskAttachmentsUpload({path: {task: taskId}, body: {files: Array.from(files)}})
			const uploaded = data.success ?? []
			const errors = data.errors ?? []
			if (uploaded.length === 0 && errors.length > 0) {
				throw new Error(uploadErrorMessage(errors))
			}
			return {uploaded, errors}
		},
		onSuccess: ({uploaded, errors}, {taskId}, client) => {
			patchTaskInCaches(client, taskId, task => ({...task, attachments: [...(task.attachments ?? []), ...uploaded]}))
			if (errors.length > 0) {
				error(new Error(uploadErrorMessage(errors)))
			}
		},
		onSettled: ({taskId}, client) => Promise.all([
			invalidateTask(client, taskId),
			invalidateTaskCollections(client, []),
		]),
	})
}

export interface DeleteAttachmentInput {
	taskId: number
	attachmentId: number
}

export function deleteAttachmentMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, attachmentId}: DeleteAttachmentInput) => {
			await taskAttachmentsDelete({path: {task: taskId, attachment: attachmentId}})
		},
		onSuccess: (_data, {taskId, attachmentId}, client) => {
			patchTaskInCaches(client, taskId, task => ({
				...task,
				attachments: (task.attachments ?? []).filter(attachment => attachment.id !== attachmentId),
				cover_image_attachment_id: task.cover_image_attachment_id === attachmentId ? 0 : task.cover_image_attachment_id,
			}))
		},
		onSettled: ({taskId}, client) => Promise.all([
			invalidateTask(client, taskId),
			invalidateTaskCollections(client, []),
		]),
	})
}

export interface SetCoverImageInput {
	taskId: number
	/** null removes the cover. */
	attachmentId: number | null
}

export function setCoverImageMutationOptions() {
	return taskPatchMutationOptions<SetCoverImageInput>({
		toPatch: ({taskId, attachmentId}) => ({id: taskId, patch: {cover_image_attachment_id: attachmentId ?? 0}}),
		successMessage: () => i18n.global.t('task.attachment.successfullyChangedCoverImage'),
	})
}

export function useUploadAttachmentsMutation() {
	return useMutation(uploadAttachmentsMutationOptions())
}

export function useDeleteAttachmentMutation() {
	return useMutation(deleteAttachmentMutationOptions())
}

export function useSetCoverImageMutation() {
	return useMutation(setCoverImageMutationOptions())
}
