import {getApiBaseUrl, getApiV2BaseUrl} from '@/helpers/apiUrl'

export interface AttachmentAddress {
	taskId: number
	attachmentId: number
}

const ATTACHMENT_PATH = /^tasks\/(\d+)\/attachments\/(\d+)\/?(?:[?#].*)?$/

// Descriptions store images under the v1 url and src/features/editor/editorExtensions.ts parses exactly that form.
export function generateAttachmentUrl(taskId: number, attachmentId: number): string {
	return `${window.API_URL}/tasks/${taskId}/attachments/${attachmentId}`
}

/** Recognises attachment urls on either api version; null for anything else. */
export function parseAttachmentUrl(url: string | null | undefined): AttachmentAddress | null {
	if (!url) {
		return null
	}
	for (const base of [getApiBaseUrl(), getApiV2BaseUrl()]) {
		if (!url.startsWith(base)) {
			continue
		}
		const match = ATTACHMENT_PATH.exec(url.slice(base.length))
		if (match) {
			return {taskId: Number(match[1]), attachmentId: Number(match[2])}
		}
	}
	return null
}
