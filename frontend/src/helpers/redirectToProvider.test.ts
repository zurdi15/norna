import {describe, it, expect, vi} from 'vitest'

import {getAutoRedirectProvider} from './redirectToProvider'
import type {Provider} from '@/client/generated'

const provider = {key: 'authentik', name: 'Authentik'} as Provider

const soleProviderContext = {
	localAuthEnabled: false,
	ldapAuthEnabled: false,
	openIdEnabled: true,
	providers: [provider],
	isDesktopApp: false,
	justLoggedOut: false,
	hasCopyableRedirect: false,
}

describe('getAutoRedirectProvider', () => {
	it('returns the provider when it is the only way to log in', () => {
		expect(getAutoRedirectProvider(soleProviderContext)).toBe(provider)
	})

	it('does not redirect when the login url carries a copyable oauth destination', () => {
		expect(getAutoRedirectProvider({...soleProviderContext, hasCopyableRedirect: true})).toBeUndefined()
	})

	it('does not redirect inside the desktop app', () => {
		expect(getAutoRedirectProvider({...soleProviderContext, isDesktopApp: true})).toBeUndefined()
	})

	it('does not redirect right after an explicit logout', () => {
		expect(getAutoRedirectProvider({...soleProviderContext, justLoggedOut: true})).toBeUndefined()
	})

	it('does not redirect when local or ldap auth is available', () => {
		expect(getAutoRedirectProvider({...soleProviderContext, localAuthEnabled: true})).toBeUndefined()
		expect(getAutoRedirectProvider({...soleProviderContext, ldapAuthEnabled: true})).toBeUndefined()
	})

	it('does not redirect when there is a choice of providers', () => {
		expect(getAutoRedirectProvider({
			...soleProviderContext,
			providers: [provider, {key: 'other', name: 'Other'} as Provider],
		})).toBeUndefined()
	})

	it('does not redirect when openid is disabled or has no providers', () => {
		expect(getAutoRedirectProvider({...soleProviderContext, openIdEnabled: false})).toBeUndefined()
		expect(getAutoRedirectProvider({...soleProviderContext, providers: []})).toBeUndefined()
	})
})

describe('redirectToProvider', () => {
	it('builds an encoded authorization URL and keeps the provider query', async () => {
		const {redirectToProvider} = await import('./redirectToProvider')
		const location = {href: 'https://norna.example/login'}
		vi.stubGlobal('location', location)

		redirectToProvider({
			key: 'authentik',
			auth_url: 'https://id.example/authorize?prompt=login',
			client_id: 'norna',
			scope: '',
		} as Provider)

		const url = new URL(location.href)
		expect(url.origin + url.pathname).toBe('https://id.example/authorize')
		expect(url.searchParams.get('prompt')).toBe('login')
		expect(url.searchParams.get('client_id')).toBe('norna')
		expect(url.searchParams.get('scope')).toBe('openid email profile')
		expect(url.searchParams.get('redirect_uri')).toMatch(/\/auth\/openid\/authentik$/)
		expect(url.searchParams.get('state')).toBe(localStorage.getItem('state'))
		vi.unstubAllGlobals()
	})
})
