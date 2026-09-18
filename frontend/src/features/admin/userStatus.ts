import type {AdminUser} from '@/client/generated'
import {USER_STATUS} from '@/client/queries/admin'

type Tone = 'neutral' | 'warning' | 'danger'

/** How an account's state reads in the admin list: nothing for an active account. */
export function statusBadge(status: number | undefined): {key: string, tone: Tone} | null {
	switch (status) {
		case USER_STATUS.EMAIL_CONFIRMATION:
			return {key: 'admin.users.status.unconfirmed', tone: 'warning'}
		case USER_STATUS.DISABLED:
			return {key: 'admin.users.status.disabled', tone: 'neutral'}
		case USER_STATUS.LOCKED:
			return {key: 'admin.users.status.locked', tone: 'danger'}
		default:
			return null
	}
}

/** Accounts signed in through LDAP or OpenID have no password here. */
export function isLocalAccount(user: Pick<AdminUser, 'auth_provider'>): boolean {
	return !user.auth_provider
}
