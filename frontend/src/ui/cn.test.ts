import {describe, expect, it} from 'vitest'

import {cn} from './cn'

describe('cn', () => {
	it('lets a later font size from our scale replace an earlier one', () => {
		expect(cn('text-sm', 'text-2xs')).toBe('text-2xs')
		expect(cn('text-md', 'text-3xs')).toBe('text-3xs')
	})

	it('keeps a text color next to a text size', () => {
		expect(cn('text-2xs', 'text-ink-muted')).toBe('text-2xs text-ink-muted')
	})

	it('lets our radius and shadow names replace defaults', () => {
		expect(cn('rounded-md', 'rounded-sheet')).toBe('rounded-sheet')
		expect(cn('shadow-raised', 'shadow-overlay')).toBe('shadow-overlay')
	})

	it('drops falsy entries', () => {
		expect(cn('px-2', false, undefined, {'py-1': true, 'py-2': false})).toBe('px-2 py-1')
	})
})
