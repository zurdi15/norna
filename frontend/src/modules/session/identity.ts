import {AUTH_TYPES, type AuthType} from '@/constants/authTypes'

// Claims the API puts in its JWTs (pkg/modules/auth/auth.go). Users carry the
// username and admin flag; link shares carry the shared project and permission.
export interface SessionIdentity {
	id: number
	type: AuthType
	exp: number
	sid?: string
	username?: string
	is_admin?: boolean
	hash?: string
	project_id?: number
	permission?: number
}

export function decodeTokenPayload(token: string | null): Record<string, unknown> | null {
	if (!token) {
		return null
	}
	try {
		const base64 = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')
		const payload = JSON.parse(atob(base64))
		return typeof payload === 'object' && payload !== null ? payload : null
	} catch {
		return null
	}
}

export function identityFromToken(token: string | null): SessionIdentity | null {
	const claims = decodeTokenPayload(token)
	if (!claims || typeof claims.id !== 'number' || typeof claims.exp !== 'number') {
		return null
	}
	const type = claims.type === AUTH_TYPES.LINK_SHARE ? AUTH_TYPES.LINK_SHARE
		: claims.type === AUTH_TYPES.USER ? AUTH_TYPES.USER
			: AUTH_TYPES.UNKNOWN
	return {
		id: claims.id,
		type,
		exp: claims.exp,
		sid: typeof claims.sid === 'string' ? claims.sid : undefined,
		username: typeof claims.username === 'string' ? claims.username : undefined,
		is_admin: typeof claims.is_admin === 'boolean' ? claims.is_admin : undefined,
		hash: typeof claims.hash === 'string' ? claims.hash : undefined,
		project_id: typeof claims.project_id === 'number' ? claims.project_id : undefined,
		permission: typeof claims.permission === 'number' ? claims.permission : undefined,
	}
}

export function isExpired(identity: Pick<SessionIdentity, 'exp'>, now = Date.now()): boolean {
	return identity.exp < Math.round(now / 1000)
}
