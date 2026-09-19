import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'

import {highlightMagic} from './highlight'
import {parseTaskText} from './quickAddMagic'
import {PREFIXES, PrefixMode} from './prefixes'

const NOW = new Date(2026, 8, 18, 10, 0)

function highlight(text: string, mode = PrefixMode.Default) {
	return highlightMagic(text, parseTaskText(text, mode, NOW), PREFIXES[mode])
		.map(segment => segment.kind ? `[${segment.kind}:${segment.text}]` : segment.text)
		.join('')
}

describe('highlightMagic', () => {
	// The date parser reads the user's default due time from the auth store.
	beforeEach(() => setActivePinia(createPinia()))

	it('marks each understood part with its kind', () => {
		expect(highlight('Call the plumber tomorrow *home !4 +Casa'))
			.toBe('Call the plumber [date:tomorrow] [label:*home] [priority:!4] [project:+Casa]')
	})

	it('keeps a quoted multi-word label together', () => {
		expect(highlight('Buy milk *"weekly shop"')).toBe('Buy milk [label:*"weekly shop"]')
	})

	it('recognises assignees, which the parser leaves in the title', () => {
		expect(highlight('Review @anna')).toBe('Review [assignee:@anna]')
	})

	it('follows the Todoist prefixes', () => {
		expect(highlight('Pay rent @bills #Casa', PrefixMode.Todoist)).toBe('Pay rent [label:@bills] [project:#Casa]')
	})

	it('leaves everything plain when magic is off or nothing matched', () => {
		expect(highlight('Plain title', PrefixMode.Disabled)).toBe('Plain title')
		expect(highlight('Nothing magic here')).toBe('Nothing magic here')
		expect(highlightMagic('', parseTaskText(''), PREFIXES[PrefixMode.Default])).toEqual([])
	})
})
