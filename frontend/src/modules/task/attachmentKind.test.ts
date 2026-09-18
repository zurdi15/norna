import {describe, expect, it} from 'vitest'

import {attachmentExtension, attachmentKind} from './attachmentKind'

const file = (name: string, mime: string) => ({file: {name, mime}})

describe('attachmentKind', () => {
	it('previews images only when both the suffix and the sniffed mime agree', () => {
		expect(attachmentKind(file('photo.JPG', 'image/jpeg'))).toBe('image')
		expect(attachmentKind(file('photo.jpg', 'text/html'))).toBe('file')
		expect(attachmentKind(file('photo', 'image/png'))).toBe('file')
	})

	it('never previews SVG, which can carry script', () => {
		expect(attachmentKind(file('logo.svg', 'image/svg+xml'))).toBe('file')
	})

	it('previews PDFs only when the server sniffed a PDF', () => {
		expect(attachmentKind(file('plan.pdf', 'application/pdf'))).toBe('pdf')
		expect(attachmentKind(file('plan.pdf', 'text/html'))).toBe('file')
	})

	it('plays video and audio by mime alone', () => {
		expect(attachmentKind(file('clip', 'video/mp4'))).toBe('video')
		expect(attachmentKind(file('memo.m4a', 'audio/mp4'))).toBe('audio')
	})

	it('treats a missing file as a plain file', () => {
		expect(attachmentKind({})).toBe('file')
	})
})

describe('attachmentExtension', () => {
	it('shows a short upper-case extension', () => {
		expect(attachmentExtension(file('tokens.json', ''))).toBe('JSON')
		expect(attachmentExtension(file('README', ''))).toBe('')
		expect(attachmentExtension(file('.env', ''))).toBe('')
	})
})
