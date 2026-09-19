import {describe, it, expect, beforeEach, vi} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'

import {useAuthStore} from './auth'
import {shouldDropEvent} from '@/helpers/sentryFilters'
import {getErrorText} from '@/message'

const {userShowMock} = vi.hoisted(() => ({
	userShowMock: vi.fn(),
}))

vi.mock('@/helpers/auth', () => ({
	refreshToken: vi.fn(),
	getToken: () => 'token',
	saveToken: vi.fn(),
	removeToken: vi.fn(),
}))

vi.mock('@/router', () => ({
	default: {push: vi.fn()},
}))

vi.mock('@/client/queryClient', () => ({
	queryClient: {clear: vi.fn()},
}))

vi.mock('@/composables/useWebSocket', () => ({
	useWebSocket: () => ({disconnect: vi.fn(), connect: vi.fn()}),
}))

vi.mock('@/client/generated', async (importOriginal) => ({
	...await importOriginal<typeof import('@/client/generated')>(),
	userShow: userShowMock,
}))

vi.mock('@/helpers/redirectToProvider', () => ({
	getRedirectUrlFromCurrentFrontendPath: vi.fn(),
	redirectToProvider: vi.fn(),
	redirectToProviderOnLogout: vi.fn(),
}))

async function refreshError(): Promise<unknown> {
	try {
		await useAuthStore().refreshUserInfo()
	} catch (e) {
		return e
	}
	throw new Error('refreshUserInfo did not throw')
}

describe('auth store refreshUserInfo failures', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		userShowMock.mockReset()
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('throws an error sentry drops on a network error', async () => {
		userShowMock.mockRejectedValue(new TypeError('Failed to fetch'))

		expect(shouldDropEvent(await refreshError())).toBe(true)
	})

	it('throws an error that shows the server message on a 5xx', async () => {
		userShowMock.mockRejectedValue({status: 500, title: 'Internal Server Error', detail: 'Internal server error'})

		const e = await refreshError()

		expect(shouldDropEvent(e)).toBe(true)
		expect(getErrorText(e)).toBe('Error while refreshing user info: Internal server error')
	})

	it('logs out on a 4xx instead of throwing', async () => {
		userShowMock.mockRejectedValue({status: 401, code: 11, detail: 'Invalid token'})

		await expect(useAuthStore().refreshUserInfo()).resolves.toBeUndefined()
	})
})
