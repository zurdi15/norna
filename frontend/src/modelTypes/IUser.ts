import type {IAbstract} from './IAbstract'
import type {IUserSettings} from './IUserSettings'

import {AUTH_TYPES, type AuthType} from '@/constants/authTypes'

export {AUTH_TYPES, type AuthType}

export interface IUser extends IAbstract {
	id: number
	email: string
	username: string
	name: string
	exp: number
	type: AuthType

	created: Date
	updated: Date
	settings: IUserSettings

	isLocalUser: boolean
	pendingEmail: string
	deletionScheduledAt: string | Date | null
	isAdmin?: boolean
	botOwnerId?: number
}
