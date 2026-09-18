import type {TaskAttachment} from '@/client/generated'

const IMAGE_SUFFIXES = ['.jpeg', '.jpg', '.png', '.bmp', '.gif', '.webp']
const PDF_SUFFIXES = ['.pdf']

export type AttachmentKind = 'image' | 'pdf' | 'video' | 'audio' | 'file'

function fileOf(attachment: Pick<TaskAttachment, 'file'>) {
	return {
		name: (attachment.file?.name ?? '').toLowerCase(),
		mime: (attachment.file?.mime ?? '').toLowerCase(),
	}
}

/**
 * How an attachment can be shown in the browser. Images and PDFs need both the
 * suffix and the mime the server sniffed: an HTML file named .pdf would otherwise
 * run script in a same-origin preview, and SVG can carry script, so it's a plain
 * file. <video> and <audio> never parse HTML, so their sniffed mime is enough.
 */
export function attachmentKind(attachment: Pick<TaskAttachment, 'file'>): AttachmentKind {
	const {name, mime} = fileOf(attachment)
	if (IMAGE_SUFFIXES.some(suffix => name.endsWith(suffix)) && mime.startsWith('image/') && mime !== 'image/svg+xml') {
		return 'image'
	}
	if (PDF_SUFFIXES.some(suffix => name.endsWith(suffix)) && mime === 'application/pdf') {
		return 'pdf'
	}
	if (mime.startsWith('video/')) {
		return 'video'
	}
	if (mime.startsWith('audio/')) {
		return 'audio'
	}
	return 'file'
}

/** The upper-case extension shown on file tiles, e.g. "JSON". */
export function attachmentExtension(attachment: Pick<TaskAttachment, 'file'>): string {
	const name = attachment.file?.name ?? ''
	const dot = name.lastIndexOf('.')
	return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase().slice(0, 5) : ''
}
