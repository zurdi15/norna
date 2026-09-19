import {describe, expect, it} from 'vitest'

import {validatePassword} from './validatePassword'

describe('validatePassword', () => {
	it('requires a password', () => {
		expect(validatePassword('')).toBe('auth.passwordRules.required')
	})

	it('enforces the length limits', () => {
		expect(validatePassword('1234567')).toBe('auth.passwordRules.tooShort')
		expect(validatePassword('x'.repeat(73))).toBe('auth.passwordRules.tooLong')
		expect(validatePassword('12345678')).toBe(true)
	})

	it('skips the length limits when asked', () => {
		expect(validatePassword('short', false)).toBe(true)
	})
})
