import {getFullBaseUrl} from '@/helpers/getFullBaseUrl'
import {createRandomID} from '@/helpers/randomId'
import type {Provider} from '@/client/generated'
import {parseURL} from 'ufo'

export function getRedirectUrlFromCurrentFrontendPath(provider: Provider): string {
	// We're not using the redirect url provided by the server to allow redirects when using the electron app.
	// The implications are not quite clear yet hence the logic to pass in another redirect url still exists.
	const url = parseURL(window.location.href)
	const base = getFullBaseUrl()
	return `${url.protocol}//${url.host}${base}auth/openid/${provider.key}`
}

export const redirectToProvider = (provider: Provider) => {

	const redirectUrl = getRedirectUrlFromCurrentFrontendPath(provider)
	const state = createRandomID(24)
	localStorage.setItem('state', state)

	// URL keeps any query the provider's auth_url already carries and encodes our params.
	const url = new URL(provider.auth_url ?? '')
	url.searchParams.set('client_id', provider.client_id ?? '')
	url.searchParams.set('redirect_uri', redirectUrl)
	url.searchParams.set('response_type', 'code')
	url.searchParams.set('scope', provider.scope || 'openid email profile')
	url.searchParams.set('state', state)
	window.location.href = url.toString()
}

export const redirectToProviderOnLogout = (provider: Provider): boolean => {
	if (provider.logout_url) {
		window.location.href = provider.logout_url
		return true
	}
	return false
}

interface AutoRedirectContext {
	localAuthEnabled: boolean
	ldapAuthEnabled: boolean
	openIdEnabled: boolean
	providers: Provider[]
	isDesktopApp: boolean
	justLoggedOut: boolean
	hasCopyableRedirect: boolean
}

/**
 * The provider the login page should redirect to without the user clicking anything,
 * or undefined when it must render the login form instead.
 */
export function getAutoRedirectProvider(ctx: AutoRedirectContext): Provider | undefined {
	// The Electron window hands login off to the system browser via DesktopLogin – redirecting
	// to the provider in-window would strand the user there with no way back to the app.
	if (ctx.isDesktopApp) {
		return undefined
	}

	// Otherwise we'd immediately re-authenticate the user we just logged out.
	if (ctx.justLoggedOut) {
		return undefined
	}

	// A native client's authorize URL is parked in the login hash so it stays copyable into the
	// browser the user is actually signed in to (#2654). Redirecting to the provider replaces it
	// before it can be copied, and the provider URL itself is not transferable: the OIDC state
	// lives in this browser's localStorage, so finishing the flow elsewhere fails the state check.
	if (ctx.hasCopyableRedirect) {
		return undefined
	}

	if (ctx.localAuthEnabled || ctx.ldapAuthEnabled) {
		return undefined
	}

	if (!ctx.openIdEnabled || ctx.providers.length !== 1) {
		return undefined
	}

	return ctx.providers[0]
}
