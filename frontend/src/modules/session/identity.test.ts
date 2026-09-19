import {describe, expect, it} from 'vitest'

import {AUTH_TYPES} from '@/constants/authTypes'
import {identityFromToken, isExpired} from './identity'

function jwt(claims: Record<string, unknown>): string {
	return `header.${btoa(JSON.stringify(claims))}.signature`
}

describe('identityFromToken', () => {
	it('reads a user session', () => {
		expect(identityFromToken(jwt({id: 1, type: 1, exp: 100, username: 'zurdi', sid: 's', is_admin: true}))).toEqual({
			id: 1,
			type: AUTH_TYPES.USER,
			exp: 100,
			sid: 's',
			username: 'zurdi',
			is_admin: true,
			hash: undefined,
			project_id: undefined,
			permission: undefined,
		})
	})

	it('reads a link share', () => {
		const identity = identityFromToken(jwt({id: 7, type: 2, exp: 100, hash: 'abc', project_id: 3, permission: 1}))

		expect(identity?.type).toBe(AUTH_TYPES.LINK_SHARE)
		expect(identity?.project_id).toBe(3)
	})

	it('rejects tokens without the required claims', () => {
		expect(identityFromToken(jwt({type: 1, exp: 100}))).toBeNull()
		expect(identityFromToken('garbage')).toBeNull()
		expect(identityFromToken(null)).toBeNull()
	})
})

describe('isExpired', () => {
	it('compares exp in seconds against now', () => {
		expect(isExpired({exp: 99}, 100_000)).toBe(true)
		expect(isExpired({exp: 100}, 100_000)).toBe(false)
	})
})
