import {describe, expect, it} from 'vitest'

import {isApiProblem, problemCode, problemStatus} from './problem'

describe('api problems', () => {
	it('recognizes a problem+json body', () => {
		const problem = {status: 412, code: 1017, detail: 'Invalid totp passcode'}

		expect(isApiProblem(problem)).toBe(true)
		expect(problemStatus(problem)).toBe(412)
		expect(problemCode(problem)).toBe(1017)
	})

	it('does not treat thrown Errors or plain values as problems', () => {
		expect(isApiProblem(new TypeError('Failed to fetch'))).toBe(false)
		expect(isApiProblem('nope')).toBe(false)
		expect(problemStatus(null)).toBeUndefined()
	})
})
