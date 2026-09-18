import {beforeEach, describe, expect, it} from 'vitest'

import {generateAttachmentUrl, parseAttachmentUrl} from './attachmentUrl'

describe('attachment urls', () => {
	beforeEach(() => {
		window.API_URL = 'http://localhost:3456/api/v1'
	})

	it('generates the v1 form the editor stores and parses', () => {
		expect(generateAttachmentUrl(5, 9)).toBe('http://localhost:3456/api/v1/tasks/5/attachments/9')
	})

	it('parses the v1 and the v2 form', () => {
		expect(parseAttachmentUrl('http://localhost:3456/api/v1/tasks/5/attachments/9')).toEqual({taskId: 5, attachmentId: 9})
		expect(parseAttachmentUrl('http://localhost:3456/api/v2/tasks/5/attachments/9?preview_size=md')).toEqual({taskId: 5, attachmentId: 9})
	})

	it('round-trips a generated url', () => {
		expect(parseAttachmentUrl(generateAttachmentUrl(12, 34))).toEqual({taskId: 12, attachmentId: 34})
	})

	it('rejects urls of other hosts or paths', () => {
		expect(parseAttachmentUrl('https://evil.example/api/v1/tasks/5/attachments/9')).toBeNull()
		expect(parseAttachmentUrl('http://localhost:3456/api/v1/tasks/5/comments/9')).toBeNull()
		expect(parseAttachmentUrl('http://localhost:3456/api/v1/tasks/5/attachments/9/../../x')).toBeNull()
		expect(parseAttachmentUrl('')).toBeNull()
	})
})
