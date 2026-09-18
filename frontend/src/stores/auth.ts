import {computed, readonly, ref, watch} from 'vue'
import {acceptHMRUpdate, defineStore} from 'pinia'

import {
	authConfirmEmail,
	authLinkShare as requestLinkShareToken,
	authLogin,
	authLogout,
	authOpenidCallback,
	authRegister,
	tokenRenew,
	userGetAvatarProvider,
	userShow,
	userUpdateSettings,
	type LoginWritable,
	type RegisterUserRequestWritable,
	type UserGeneralSettings,
	type UserInfoBody,
} from '@/client/generated'
import {registerViaInviteLink} from '@/client/inviteLink'
import {queryClient} from '@/client/queryClient'
import {useWebSocket} from '@/composables/useWebSocket'
import {AUTH_TYPES} from '@/constants/authTypes'
import {getToken, refreshToken, removeToken, saveToken} from '@/helpers/auth'
import {parseValidationErrors} from '@/helpers/parseValidationErrors'
import {
	getRedirectUrlFromCurrentFrontendPath,
	redirectToProvider,
	redirectToProviderOnLogout,
} from '@/helpers/redirectToProvider'
import {clearTaskCache} from '@/helpers/taskCache'
import {getBrowserLanguage, i18n, setLanguage, translate, type SupportedLocale} from '@/i18n'
import {error, success} from '@/message'
import {problemCode, problemStatus} from '@/modules/api/problem'
import {identityFromToken, isExpired, type SessionIdentity} from '@/modules/session/identity'
import {
	mergeFrontendSettings,
	parseUserSettings,
	type FrontendSettings,
	type UserSettings,
} from '@/modules/settings/userSettings'
import {invalidateAvatarCache} from '@/modules/user/avatar'
import {getDisplayName} from '@/modules/user/displayName'
import router from '@/router'
import {useConfigStore} from '@/stores/config'

// Set on explicit logout so the login page won't immediately bounce the user
// back to the OIDC provider. Lives in sessionStorage so it survives the
// round-trip to the IdP within the tab and isn't wiped by localStorage.clear().
export const JUST_LOGGED_OUT_KEY = 'justLoggedOut'

// The signed-in identity: JWT claims, completed with the /user profile for users.
export type CurrentUser = Omit<UserInfoBody, '$schema' | 'settings' | 'id' | 'username' | 'is_admin'> & SessionIdentity

const TOTP_REQUIRED = 1017
const INVALID_FIELDS = 2002

function redirectToSpecifiedProvider() {
	const {auth} = useConfigStore()
	const providers = auth.openid_connect.providers
	const searchParams = new URLSearchParams(window.location.search)
	if (!searchParams.has('redirectToProvider')) {
		return
	}

	const redirectToProviderValue = searchParams.get('redirectToProvider')

	if (
		providers.length === 1
		&& (window.location.pathname.startsWith('/login') || window.location.pathname === '/') // Kinda hacky, but prevents an endless loop.
		&& (redirectToProviderValue === null
			|| redirectToProviderValue === 'true'
			|| redirectToProviderValue === '1')
	) {
		redirectToProvider(providers[0]!)
	}

	const wantedProvider = providers.find(p => p.key === redirectToProviderValue)
	if (wantedProvider) {
		redirectToProvider(wantedProvider)
	}
	console.warn(`Could not find provider to redirect to.\nWanted: ${redirectToProviderValue}\nAvailable: ${providers.map(p => p.key)}`)
}

// A race-loser's refresh fails but the rotated cookie is already valid, so a
// second attempt succeeds — recovering what would otherwise be a spurious
// logout. Exactly one retry: a genuinely dead session still logs out, no loop.
async function refreshTokenWithRetry(persist: boolean): Promise<void> {
	try {
		await refreshToken(persist)
	} catch {
		await refreshToken(persist)
	}
}

function getLoggedInVia(): string | null {
	return localStorage.getItem('loggedInViaProvider')
}

function setLoggedInVia(provider: string | null): void {
	if (provider) {
		localStorage.setItem('loggedInViaProvider', provider)
	} else {
		localStorage.removeItem('loggedInViaProvider')
	}
}

export const useAuthStore = defineStore('auth', () => {
	const configStore = useConfigStore()

	const authenticated = ref(false)
	const needsTotpPasscode = ref(false)

	const info = ref<CurrentUser | null>(null)
	const settings = ref<UserSettings>(parseUserSettings(undefined))
	// The frontend_settings blob exactly as the server last sent it: saving merges into it
	// so keys this frontend doesn't know survive.
	let storedFrontendSettings: unknown = undefined

	const currentSessionId = ref<string | null>(null)
	const lastUserInfoRefresh = ref<Date | null>(null)
	const isLoading = ref(false)
	const isLoadingGeneralSettings = ref(false)

	const authUser = computed(() => authenticated.value && info.value?.type === AUTH_TYPES.USER)
	const authLinkShare = computed(() => authenticated.value && info.value?.type === AUTH_TYPES.LINK_SHARE)
	const userDisplayName = computed(() => info.value ? getDisplayName(info.value) : undefined)
	const isLinkShareAuth = computed(() => info.value?.type === AUTH_TYPES.LINK_SHARE)
	const identityKey = computed(() => `${info.value?.id ?? ''}:${info.value?.type ?? ''}`)

	// Identity-bound caches survive same-user object replacements.
	watch(identityKey, () => {
		clearTaskCache()
		queryClient.clear()
	}, {flush: 'sync'})

	function setIsLoading(newIsLoading: boolean) {
		isLoading.value = newIsLoading
	}

	function setIsLoadingGeneralSettings(newIsLoading: boolean) {
		isLoadingGeneralSettings.value = newIsLoading
	}

	function setUser(newUser: CurrentUser | null, rawSettings?: UserGeneralSettings) {
		// checkAuth() calls this on every navigation; only drop the avatar cache on an actual account change.
		const userChanged = info.value?.username !== newUser?.username
		info.value = newUser
		if (newUser !== null && !isLinkShareAuth.value) {
			if (userChanged) {
				invalidateAvatar()
			}
			if (rawSettings) {
				loadSettings(rawSettings)
			}
		}
	}

	function loadSettings(raw: UserGeneralSettings) {
		storedFrontendSettings = raw.frontend_settings
		settings.value = parseUserSettings(raw)

		// Sync the quick entry shortcut to the desktop app when settings are loaded
		window.vikunjaDesktop?.updateQuickEntryShortcut(settings.value.frontend_settings.desktop_quick_entry_shortcut || '')
	}

	function setAuthenticated(newAuthenticated: boolean) {
		authenticated.value = newAuthenticated
	}

	function setNeedsTotpPasscode(newNeedsTotpPasscode: boolean) {
		needsTotpPasscode.value = newNeedsTotpPasscode
	}

	function invalidateAvatar() {
		invalidateAvatarCache(info.value?.username)
	}

	function updateLastUserRefresh() {
		lastUserInfoRefresh.value = new Date()
	}

	async function login(credentials: LoginWritable) {
		setIsLoading(true)

		// Delete an eventually preexisting old token
		removeToken()

		try {
			const {data} = await authLogin({body: credentials})
			saveToken(data.token ?? '', true)

			// Tell others the user is authenticated
			await checkAuth()
		} catch (e) {
			if (problemCode(e) === TOTP_REQUIRED && !credentials.totp_passcode) {
				setNeedsTotpPasscode(true)
			}

			throw e
		} finally {
			setIsLoading(false)
		}
	}

	/**
	 * Registers a new user and logs them in.
	 */
	async function register(credentials: RegisterUserRequestWritable, language: string | null = null, viaInvite = false): Promise<void> {
		setIsLoading(true)

		const lang = language ?? i18n.global.locale.value ?? getBrowserLanguage()

		try {
			if (viaInvite) {
				await registerViaInviteLink({...credentials, language: lang})
			} else {
				await authRegister({body: {...credentials, language: lang}})
			}
			return await login({username: credentials.username, password: credentials.password})
		} catch (e) {
			// An instance without our UI language rejects it; English always exists.
			if (problemCode(e) === INVALID_FIELDS && parseValidationErrors(e as never).language) {
				return register(credentials, 'en', viaInvite)
			}
			const problem = e as {detail?: string, message?: string}
			if (problem?.detail) {
				throw {...problem, message: problem.detail}
			}
			throw e
		} finally {
			setIsLoading(false)
		}
	}

	function registerWithInvite(credentials: RegisterUserRequestWritable) {
		return register(credentials, null, true)
	}

	async function openIdAuth({provider, code, totpPasscode}: {provider: string, code: string, totpPasscode?: string}) {
		setIsLoading(true)
		setLoggedInVia(null)

		const fullProvider = configStore.auth.openid_connect.providers.find(p => p.key === provider)

		// Delete an eventually preexisting old token
		removeToken()
		try {
			const {data} = await authOpenidCallback({
				path: {provider},
				body: {
					code,
					redirect_url: fullProvider ? getRedirectUrlFromCurrentFrontendPath(fullProvider) : undefined,
					totp_passcode: totpPasscode,
				},
			})
			saveToken(data.token ?? '', true)
			setLoggedInVia(provider)

			// Tell others the user is authenticated
			await checkAuth()
		} finally {
			setIsLoading(false)
		}
	}

	async function handleDesktopOAuthTokens(tokens: {access_token: string, refresh_token: string, expires_in: number}) {
		setIsLoading(true)
		try {
			removeToken()
			saveToken(tokens.access_token, true)
			localStorage.setItem('desktopOAuthRefreshToken', tokens.refresh_token)
			await checkAuth()
		} finally {
			setIsLoading(false)
		}
	}

	async function linkShareAuth({hash, password}: {hash: string, password?: string}) {
		const {data} = await requestLinkShareToken({path: {share: hash}, body: {password}})
		saveToken(data.token ?? '', false)
		// Reset the debounce so checkAuth() actually parses the new link share
		// JWT instead of silently returning due to the 1-minute throttle.
		lastUserInfoRefresh.value = null
		await checkAuth()
		return data
	}

	/**
	 * Populates user information from the jwt token saved in local storage.
	 */
	async function checkAuth() {
		const now = new Date()
		const oneMinuteAgo = new Date(new Date().setMinutes(now.getMinutes() - 1))
		// This function can be called from multiple places at the same time and shortly after one another.
		// To prevent hitting the api too frequently or race conditions, we check at most once per minute.
		if (lastUserInfoRefresh.value !== null && lastUserInfoRefresh.value > oneMinuteAgo) {
			return
		}

		const jwt = getToken()
		let isAuthenticated = false
		if (jwt) {
			let identity = identityFromToken(jwt)
			if (identity === null) {
				// Unreadable token: drop it and carry on logged out. A full logout() would
				// call back into checkAuth() while the token is still there.
				removeToken()
			}

			isAuthenticated = identity !== null && !isExpired(identity)
			currentSessionId.value = identity?.sid ?? null

			if (identity !== null && !isAuthenticated && identity.type === AUTH_TYPES.USER) {
				// JWT expired but this is a user session: try a cookie-based refresh before
				// giving up, so reopening the app after the short JWT TTL resumes the session.
				try {
					await refreshTokenWithRetry(true)
					const fresh = identityFromToken(getToken())
					if (fresh) {
						identity = fresh
						isAuthenticated = !isExpired(fresh)
						currentSessionId.value = fresh.sid ?? null
					}
				} catch {
					// Refresh failed — stay unauthenticated
				}
			}

			if (isAuthenticated && identity !== null) {
				// Keep an already loaded profile for the same identity: the JWT lacks fields
				// like `name`, and swapping them out flashes the username in its place. Type
				// matters as well as id: users and link shares share the numeric id space, and
				// matching on id alone once kept a user session while a colliding link share
				// was opened, bouncing the router guard forever.
				if (info.value === null || info.value.id !== identity.id || info.value.type !== identity.type) {
					setUser({...identity})
				} else {
					// Always keep exp in sync so token renewal checks stay accurate
					info.value.exp = identity.exp
				}
			}

			if (isAuthenticated && identity?.type !== AUTH_TYPES.LINK_SHARE) {
				const user = await refreshUserInfo()
				if (!user) {
					// No user came back: the token vanished or a 4xx triggered logout(),
					// which already set the auth state.
					return
				}
			}
		}

		setAuthenticated(isAuthenticated)
		if (!isAuthenticated) {
			setUser(null)
			redirectToSpecifiedProvider()
		}

		return authenticated
	}

	async function refreshUserInfo(): Promise<CurrentUser | undefined> {
		const jwt = getToken()
		if (!jwt) {
			return
		}

		try {
			const {data} = await userShow()
			const current = info.value ?? identityFromToken(jwt)
			const newUser: CurrentUser = {
				...data,
				id: data.id ?? current?.id ?? 0,
				type: current?.type ?? AUTH_TYPES.USER,
				exp: current?.exp ?? 0,
				sid: current?.sid,
			}

			if (data.settings?.language) {
				await setLanguage(data.settings.language as SupportedLocale)
			}

			setUser(newUser, data.settings)
			updateLastUserRefresh()

			return newUser
		} catch (e) {
			const status = problemStatus(e)
			if (status !== undefined && status >= 400 && status < 500) {
				await logout()
				return
			}

			console.error('Error refreshing user info:', e)

			throw new Error('Error while refreshing user info:', {cause: e})
		}
	}

	/**
	 * Confirms the email address from the link in the confirmation email.
	 */
	async function verifyEmail(token = localStorage.getItem('emailConfirmToken')): Promise<boolean> {
		if (!token) {
			return false
		}
		setIsLoading(true)
		try {
			await authConfirmEmail({body: {token}})
			return true
		} catch (e) {
			const problem = e as {detail?: string, message?: string}
			throw new Error(problem?.detail ?? problem?.message ?? '', {cause: e})
		} finally {
			localStorage.removeItem('emailConfirmToken')
			setIsLoading(false)
		}
	}

	/**
	 * Saves the general settings. The store updates first so the UI reflects the change
	 * right away; frontend settings are merged into the stored blob before sending.
	 */
	async function saveUserSettings({
		settings: newSettings,
		showMessage = true,
	}: {
		settings: UserSettings,
		showMessage?: boolean,
	}) {
		setIsLoadingGeneralSettings(true)
		try {
			const oldName = info.value?.name
			const frontendSettings = mergeFrontendSettings(storedFrontendSettings, newSettings.frontend_settings)
			const {extra_settings_links: _links, ...writable} = newSettings
			const body = {
				...writable,
				frontend_settings: frontendSettings,
				// The demo instance resets users regularly; don't pin a language there.
				language: configStore.demo_mode_enabled ? undefined : writable.language,
			}

			settings.value = {...newSettings}
			if (info.value) {
				info.value = {...info.value, name: newSettings.name}
			}
			await setLanguage(newSettings.language as SupportedLocale)
			await userUpdateSettings({body})
			storedFrontendSettings = frontendSettings

			if (oldName !== undefined && oldName !== newSettings.name) {
				const {data} = await userGetAvatarProvider()
				if (data.avatar_provider === 'initials') {
					invalidateAvatar()
				}
			}
			if (showMessage) {
				success({message: translate('user.settings.general.savedSuccess')})
			}
		} catch (e) {
			error(e)
		} finally {
			setIsLoadingGeneralSettings(false)
		}
	}

	// Saves one or more frontend settings without touching the rest.
	function saveFrontendSettings(patch: Partial<FrontendSettings>, showMessage = false) {
		return saveUserSettings({
			settings: {
				...settings.value,
				frontend_settings: {...settings.value.frontend_settings, ...patch},
			},
			showMessage,
		})
	}

	/**
	 * Renews the api token and saves it to local storage
	 */
	async function renewToken() {
		if (!authenticated.value) {
			return
		}

		try {
			if (isLinkShareAuth.value) {
				// Link shares renew via the dedicated link-share endpoint (JWT-based).
				const {data} = await tokenRenew()
				saveToken(data.token ?? '', false)
			} else {
				// User sessions renew via the refresh-token cookie.
				await refreshTokenWithRetry(true)
			}
			await checkAuth()
		} catch (e) {
			// Only logout if the JWT has actually expired and we can't refresh.
			// If the JWT is still valid, the proactive refresh failure is harmless
			// — the 401 interceptor will handle it when the token really expires.
			const expired = !info.value?.exp || isExpired(info.value)
			const status = (e as {cause?: {response?: {status?: number}}})?.cause?.response?.status ?? problemStatus(e)
			if (expired && status) {
				await logout()
			}
		}
	}

	async function logout() {
		const {disconnect} = useWebSocket()
		disconnect()

		// Revoke the server session so the refresh token can't be reused.
		// Best-effort: if the network call fails, still clean up locally.
		let oidcLogoutUrl = ''
		try {
			const {data} = await authLogout()
			oidcLogoutUrl = data?.oidc_logout_url ?? ''
		} catch {
			// Ignore — session will expire naturally
		}

		removeToken()
		const loggedInVia = getLoggedInVia()
		lastUserInfoRefresh.value = null
		setAuthenticated(false)
		setUser(null)
		window.localStorage.clear() // Clear all settings and history we might have saved in local storage.

		sessionStorage.setItem(JUST_LOGGED_OUT_KEY, 'true')

		// Redirect to the OIDC provider to end its session too. Prefer the
		// server-built RP-Initiated Logout URL, falling back to the static one.
		// These full-page redirects return the user to the login page, so we
		// must not router.push there first — that would consume
		// JUST_LOGGED_OUT_KEY before the round-trip lands.
		if (oidcLogoutUrl) {
			window.location.href = oidcLogoutUrl
			return
		}
		const fullProvider = configStore.auth.openid_connect.providers.find(p => p.key === loggedInVia)
		if (fullProvider && redirectToProviderOnLogout(fullProvider)) {
			return
		}

		await router.push({name: 'user.login'})
		await checkAuth()
	}

	return {
		// state
		authenticated: readonly(authenticated),
		needsTotpPasscode: readonly(needsTotpPasscode),

		info: readonly(info),
		settings: readonly(settings),

		currentSessionId: readonly(currentSessionId),
		lastUserInfoRefresh: readonly(lastUserInfoRefresh),

		authUser,
		authLinkShare,
		userDisplayName,
		isLinkShareAuth,
		identityKey,

		isLoading: readonly(isLoading),
		setIsLoading,

		isLoadingGeneralSettings: readonly(isLoadingGeneralSettings),
		setIsLoadingGeneralSettings,

		setUser,
		setSettings: loadSettings,
		setAuthenticated,
		setNeedsTotpPasscode,

		invalidateAvatar,
		updateLastUserRefresh,

		login,
		register,
		registerWithInvite,
		openIdAuth,
		handleDesktopOAuthTokens,
		linkShareAuth,
		checkAuth,
		refreshUserInfo,
		verifyEmail,
		saveUserSettings,
		saveFrontendSettings,
		renewToken,
		logout,
	}
})

// support hot reloading
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
