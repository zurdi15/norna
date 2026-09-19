import {ref, toValue, watch, type MaybeRefOrGetter} from 'vue'

import type {TaskAttachment} from '@/client/generated'
import {fetchAttachmentBlobUrl, type AttachmentPreviewSize} from '@/client/queries/taskAttachments'

/** An object url for an attachment, loaded when the attachment (or size) changes; undefined until then. */
export function useAttachmentUrl(
	attachment: MaybeRefOrGetter<TaskAttachment | undefined>,
	size?: MaybeRefOrGetter<AttachmentPreviewSize | undefined>,
) {
	const url = ref<string>()
	const failed = ref(false)
	let request = 0

	watch(() => [toValue(attachment), toValue(size)] as const, async ([current, currentSize]) => {
		const id = ++request
		url.value = undefined
		failed.value = false
		if (current?.id === undefined || current.task_id === undefined) {
			return
		}
		try {
			const loaded = await fetchAttachmentBlobUrl({taskId: current.task_id, attachmentId: current.id}, currentSize)
			if (id === request) {
				url.value = loaded
			}
		} catch {
			if (id === request) {
				failed.value = true
			}
		}
	}, {immediate: true})

	return {url, failed}
}
