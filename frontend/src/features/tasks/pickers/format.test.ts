import {describe, expect, it} from 'vitest'

import {formatDayHint} from './format'

// Wednesday
const now = new Date(2026, 8, 16, 22, 30)

describe('formatDayHint', () => {
	it('shows weekday and day within the next two weeks', () => {
		expect(formatDayHint(new Date(2026, 8, 16), now, 'es-ES')).toBe('mié 16')
		expect(formatDayHint(new Date(2026, 8, 19), now, 'en')).toBe('Sat 19')
		expect(formatDayHint(new Date(2026, 8, 22), now, 'es-ES')).toBe('mar 22')
		expect(formatDayHint(new Date(2026, 8, 29), now, 'es-ES')).toBe('mar 29')
	})

	it('shows day and month further out, with the year when it changes', () => {
		expect(formatDayHint(new Date(2026, 8, 30), now, 'es-ES')).toBe('30 sept')
		expect(formatDayHint(new Date(2026, 9, 16), now, 'en')).toBe('Oct 16')
		expect(formatDayHint(new Date(2027, 0, 4), now, 'es-ES')).toBe('4 ene 2027')
	})
})
