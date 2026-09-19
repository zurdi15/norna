import {describe, expect, it} from 'vitest'

import {toCssHex} from './toCssHex'

describe('toCssHex', () => {
	it('adds the missing hash', () => {
		expect(toCssHex('e8e8e8')).toBe('#e8e8e8')
	})

	it('keeps an existing hash', () => {
		expect(toCssHex('#1973ff')).toBe('#1973ff')
	})

	it('treats empty values as no color', () => {
		expect(toCssHex('')).toBeUndefined()
		expect(toCssHex('#')).toBeUndefined()
		expect(toCssHex(null)).toBeUndefined()
		expect(toCssHex(undefined)).toBeUndefined()
	})

	it('rejects anything that is not a hex color', () => {
		expect(toCssHex('red')).toBeUndefined()
		expect(toCssHex('url(x)')).toBeUndefined()
	})
})
