import {describe, expect, it} from 'vitest'

import {NEVER_EXPIRES, neverExpires} from './format'

describe('neverExpires', () => {
	it('recognises the "never" date in whatever offset the server returns it', () => {
		expect(neverExpires(NEVER_EXPIRES)).toBe(true)
		expect(neverExpires('9999-12-31T02:00:00+02:00')).toBe(true)
		expect(neverExpires('9999-12-30T19:00:00-05:00')).toBe(true)
	})

	it('leaves real expiry dates and missing ones alone', () => {
		expect(neverExpires('2027-01-01T00:00:00Z')).toBe(false)
		expect(neverExpires(undefined)).toBe(false)
	})
})
