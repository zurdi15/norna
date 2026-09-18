import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocation } from 'vue-router'
import {saveLastVisited} from '@/helpers/saveLastVisited'

import {getProjectViewId} from '@/helpers/projectView'
import {parseDateOrString} from '@/helpers/time/parseDateOrString'
import {getNextWeekDate} from '@/helpers/time/getNextWeekDate'
import {LINK_SHARE_HASH_PREFIX} from '@/constants/linkShareHash'
import {REDIRECT_HASH_PREFIX} from '@/constants/redirectHash'
import {AUTH_ROUTE_NAMES} from '@/constants/authRouteNames'
import {PRO_FEATURE} from '@/constants/proFeatures'
import {translate} from '@/i18n'
import {error, success} from '@/message'

import {useAuthStore} from '@/stores/auth'
import {useBaseStore} from '@/stores/base'
import {useConfigStore} from '@/stores/config'

// Every route renders this until its page is rebuilt; phases swap in the real page one route at a time.
const PagePending = () => import('@/pages/PagePending.vue')

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	scrollBehavior(to, from, savedPosition) {
		// If the user is using their forward/backward keys to navigate, we want to restore the scroll view
		if (savedPosition) {
			return savedPosition
		}

		// Scroll to anchor should still work
		if (to.hash && !to.hash.startsWith(LINK_SHARE_HASH_PREFIX) && !to.hash.startsWith(REDIRECT_HASH_PREFIX)) {
			return {el: to.hash}
		}

		// Otherwise just scroll to the top
		return {left: 0, top: 0}
	},
	routes: [
		// Design system catalog, dev builds only. Public so it can be checked without an account.
		...(import.meta.env.DEV ? [{
			path: '/_ui',
			name: 'dev.ui',
			component: () => import('@/pages/dev/PageUiCatalog.vue'),
			meta: {public: true},
		}] : []),
		{
			path: '/',
			name: 'home',
			component: () => import('@/pages/PageHome.vue'),
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('@/pages/PageNotFound.vue'),
		},
		// if you omit the last `*`, the `/` character in params will be encoded when resolving or pushing
		{
			path: '/:pathMatch(.*)',
			name: 'bad-not-found',
			component: () => import('@/pages/PageNotFound.vue'),
		},
		{
			path: '/login',
			name: 'user.login',
			component: () => import('@/pages/auth/PageLogin.vue'),
			meta: {
				title: 'user.auth.login',
			},
		},
		{
			path: '/get-password-reset',
			name: 'user.password-reset.request',
			component: () => import('@/pages/auth/PageRequestPasswordReset.vue'),
			meta: {
				title: 'user.auth.resetPassword',
			},
		},
		{
			path: '/password-reset',
			name: 'user.password-reset.reset',
			component: () => import('@/pages/auth/PagePasswordReset.vue'),
			meta: {
				title: 'user.auth.resetPassword',
			},
		},
		{
			path: '/register',
			name: 'user.register',
			component: () => import('@/pages/auth/PageRegister.vue'),
			meta: {
				title: 'user.auth.createAccount',
			},
		},
		{
			path: '/user/settings',
			name: 'user.settings',
			component: PagePending,
			redirect: {name: 'user.settings.general'},
			children: [
				{
					path: '/user/settings/avatar',
					name: 'user.settings.avatar',
					component: PagePending,
				},
				{
					path: '/user/settings/caldav',
					name: 'user.settings.caldav',
					component: PagePending,
					beforeEnter: async () => {
						const {useConfigStore} = await import('@/stores/config')
						if (!useConfigStore().caldav_enabled) {
							return {name: 'user.settings.general'}
						}
					},
				},
				{
					path: '/user/settings/mcp',
					name: 'user.settings.mcp',
					component: PagePending,
				},
				{
					path: '/user/settings/data-export',
					name: 'user.settings.data-export',
					component: PagePending,
				},
				{
					path: '/user/settings/feeds',
					name: 'user.settings.feeds',
					component: PagePending,
				},
				{
					path: '/user/settings/deletion',
					name: 'user.settings.deletion',
					component: PagePending,
				},
				{
					path: '/user/settings/email-update',
					name: 'user.settings.email-update',
					component: PagePending,
				},
				{
					path: '/user/settings/general',
					name: 'user.settings.general',
					component: PagePending,
				},
				{
					path: '/user/settings/password-update',
					name: 'user.settings.password-update',
					component: PagePending,
				},
				{
					path: '/user/settings/totp',
					name: 'user.settings.totp',
					component: PagePending,
					beforeEnter: async () => {
						const {useConfigStore} = await import('@/stores/config')
						if (!useConfigStore().totp_enabled || !useAuthStore().info?.is_local_user) {
							return {name: 'user.settings.general'}
						}
					},
				},
				{
					path: '/user/settings/api-tokens',
					name: 'user.settings.apiTokens',
					component: PagePending,
				},
				{
					path: '/user/settings/sessions',
					name: 'user.settings.sessions',
					component: PagePending,
				},
				{
					path: '/user/settings/webhooks',
					name: 'user.settings.webhooks',
					component: PagePending,
				},
				{
					path: '/user/settings/bots',
					name: 'user.settings.bots',
					component: PagePending,
				},
				{
					path: '/user/settings/migrate',
					name: 'migrate.start',
					component: PagePending,
				},
				{
					path: '/migrate/csv',
					name: 'migrate.csv',
					component: PagePending,
				},
				{
					path: '/migrate/:service',
					name: 'migrate.service',
					component: PagePending,
					props: route => ({
						service: route.params.service as string,
						code: route.query.code as string,
					}),
				},
			],
		},
		{
			path: '/user/export/download',
			name: 'user.export.download',
			component: PagePending,
		},
		{
			path: '/share/:share/auth',
			name: 'link-share.auth',
			component: () => import('@/pages/auth/PageLinkShareAuth.vue'),
		},
		{
			path: '/tasks/:id',
			name: 'task.detail',
			component: () => import('@/pages/PageTaskDetail.vue'),
			props: route => ({ taskId: Number(route.params.id as string) }),
		},
		{
			path: '/tasks/by/upcoming',
			name: 'tasks.range',
			component: () => import('@/pages/PageUpcoming.vue'),
			props: route => ({
				dateFrom: parseDateOrString(route.query.from as string, new Date()),
				dateTo: parseDateOrString(route.query.to as string, getNextWeekDate()),
				showNulls: route.query.showNulls === 'true',
				showOverdue: route.query.showOverdue === 'true',
			}),
		},
		{
			// Redirect old list routes to the respective project routes
			// see: https://router.vuejs.org/guide/essentials/dynamic-matching.html#catch-all-404-not-found-route
			path: '/lists:pathMatch(.*)*',
			name: 'lists',
			redirect(to) {
				return {
					path: to.path.replace('/lists', '/projects'),
					query: to.query,
					hash: to.hash,
				}
			},
		},
		{
			path: '/projects',
			name: 'projects.index',
			component: PagePending,
		},
		{
			path: '/projects/new',
			name: 'project.create',
			component: PagePending,
		},
		{
			path: '/projects/:parentProjectId/new',
			name: 'project.createFromParent',
			component: PagePending,
			props: route => ({ parentProjectId: Number(route.params.parentProjectId as string) }),
		},
		{
			path: '/projects/:projectId(\\d+)/settings/edit',
			name: 'project.settings.edit',
			component: PagePending,
			props: route => ({ projectId: Number(route.params.projectId as string) }),
		},
		{
			path: '/projects/:projectId/settings/background',
			name: 'project.settings.background',
			component: PagePending,
		},
		{
			path: '/projects/:projectId/settings/duplicate',
			name: 'project.settings.duplicate',
			component: PagePending,
		},
		{
			path: '/projects/:projectId/settings/share',
			name: 'project.settings.share',
			component: PagePending,
		},
		{
			path: '/projects/:projectId/settings/webhooks',
			name: 'project.settings.webhooks',
			component: PagePending,
		},
		{
			path: '/projects/:projectId(\\d+)/settings/delete',
			name: 'project.settings.delete',
			component: PagePending,
		},
		{
			path: '/projects/:projectId/settings/archive',
			name: 'project.settings.archive',
			component: PagePending,
		},
		{
			path: '/projects/:projectId/settings/views',
			name: 'project.settings.views',
			component: PagePending,
			props: route => ({ projectId: Number(route.params.projectId as string) }),
		},
		{
			// Saved-filter pseudo-projects use IDs <= -2; -1 is the Favorites pseudo-project.
			path: '/projects/:projectId(-[2-9]\\d*|-1\\d+)/settings/edit',
			name: 'filter.settings.edit',
			component: PagePending,
			props: route => ({ projectId: Number(route.params.projectId as string) }),
		},
		{
			path: '/projects/:projectId(-[2-9]\\d*|-1\\d+)/settings/delete',
			name: 'filter.settings.delete',
			component: PagePending,
			props: route => ({ projectId: Number(route.params.projectId as string) }),
		},
		{
			path: '/projects/:projectId/info',
			name: 'project.info',
			component: PagePending,
			props: route => ({ projectId: Number(route.params.projectId as string) }),
		},
		{
			path: '/projects/:projectId',
			name: 'project.index',
			redirect(to) {
				const viewId = getProjectViewId(Number(to.params.projectId as string))

				if (viewId) {
					console.debug('Replaced list view with', viewId)
				}

				return {
					name: 'project.view',
					params: {
						projectId: parseInt(to.params.projectId as string),
						viewId: viewId ?? 0,
					},
				}
			},
		},
		{
			path: '/projects/:projectId/:viewId',
			name: 'project.view',
			component: () => import('@/pages/PageProject.vue'),
			props: route => ({ 
				projectId: parseInt(route.params.projectId as string),
				viewId: route.params.viewId ? parseInt(route.params.viewId as string): undefined,
			}),
		},
		{
			path: '/teams',
			name: 'teams.index',
			component: PagePending,
		},
		{
			path: '/teams/new',
			name: 'teams.create',
			component: PagePending,
		},
		{
			path: '/teams/:id/edit',
			name: 'teams.edit',
			component: PagePending,
		},
		{
			path: '/labels',
			name: 'labels.index',
			component: PagePending,
		},
		{
			path: '/labels/new',
			name: 'labels.create',
			component: PagePending,
		},
		{
			path: '/filters/new',
			name: 'filters.create',
			component: PagePending,
		},
		{
			path: '/auth/openid/:provider',
			name: 'openid.auth',
			component: () => import('@/pages/auth/PageOpenIdCallback.vue'),
		},
		{
			path: '/oauth/authorize',
			name: 'oauth.authorize',
			component: PagePending,
		},
		{
			path: '/about',
			name: 'about',
			component: PagePending,
		},
		{
			path: '/time-tracking',
			name: 'time-tracking',
			component: PagePending,
			meta: {
				requiresTimeTracking: true,
				title: 'timeTracking.title',
			},
		},
		{
			path: '/admin',
			component: PagePending,
			meta: {
				requiresAdminPanel: true,
				adminMode: true,
			},
			children: [
				{
					path: '',
					name: 'admin.overview',
					component: PagePending,
				},
				{
					path: 'users',
					name: 'admin.users',
					component: PagePending,
				},
				{
					path: 'projects',
					name: 'admin.projects',
					component: PagePending,
				},
				{
					path: 'invite-links',
					name: 'admin.inviteLinks',
					component: PagePending,
					meta: {
						requiresUserInvites: true,
					},
				},
			],
		},
	],
})

// The slice of the auth store the guard reads, so tests can pass a plain object.
interface RouteAuthState {
	authUser: unknown
	authLinkShare: unknown
	info?: {pending_email?: string | null} | null
	verifyEmail(token: string): Promise<unknown>
	refreshUserInfo(): Promise<unknown>
}

export async function getAuthForRoute(to: RouteLocation, authStore: RouteAuthState) {
	if (to.meta?.public) {
		return
	}

	// vue-router already decoded to.hash once, so slicing off the prefix yields the original
	// fullPath (e.g. /oauth/authorize?...) losslessly — no extra decodeURIComponent needed.
	const redirectDest = to.name === 'user.login' && to.hash.startsWith(REDIRECT_HASH_PREFIX)
		? to.hash.slice(REDIRECT_HASH_PREFIX.length)
		: ''

	// Signed-in browsers bounce off the login page, so the token has to be redeemed here.
	const rawConfirmToken = to.query.userEmailConfirm
	const confirmToken = Array.isArray(rawConfirmToken) ? rawConfirmToken[0] : rawConfirmToken
	if (typeof confirmToken === 'string' && confirmToken !== '' && authStore.authUser) {
		try {
			// info may predate a change requested in another session; re-read before judging.
			await authStore.refreshUserInfo()
			const hadPending = !!authStore.info?.pending_email
			await authStore.verifyEmail(confirmToken)
			await authStore.refreshUserInfo()
			if (hadPending && !authStore.info?.pending_email) {
				success({message: translate('user.settings.updateEmailConfirmed')})
				return {name: 'user.settings.email-update'}
			}
		} catch (e) {
			// verifyEmail rethrows with the axios error as cause; the i18n code lookup needs the original
			error((e as {cause?: unknown})?.cause ?? e)
		}
		return {name: 'home'}
	}

	if (authStore.authUser || authStore.authLinkShare) {
		// An already-signed-in browser that opens a copied /login#redirect=<oauth.authorize> URL
		// must run the OAuth flow with its existing session instead of short-circuiting to home.
		// The destination has no redirect hash, so the second guard pass just early-returns (#2654).
		if (redirectDest) {
			return redirectDest
		}
		return
	}

	// Check if password reset token is in query params
	const resetToken = to.query.userPasswordReset as string | undefined
	
	// Redirect to password reset page if we have a token stored
	if (resetToken && to.name !== 'user.password-reset.reset') {
		return {name: 'user.password-reset.reset', query: { userPasswordReset: resetToken }}
	}

	if (typeof resetToken === 'undefined' && to.name === 'user.password-reset.reset') {
		return {name: 'user.login'}
	}

	// Check if email confirmation token is in query params
	const emailConfirmToken = to.query.userEmailConfirm as string | undefined
	if (emailConfirmToken) {
		// Save token to localStorage before redirecting
		localStorage.setItem('emailConfirmToken', emailConfirmToken)
		// Redirect to login page where it will be processed
		if (to.name !== 'user.login') {
			return {name: 'user.login'}
		}
	}

	// Keep the destination in the address bar (not just per-browser localStorage) so a native
	// client's /oauth/authorize URL stays copyable into another browser. Hash, not query, so the
	// embedded OAuth params never reach access logs (#2654). Pass fullPath raw: vue-router encodes
	// the hash itself, so an extra encodeURIComponent here would be double-encoded in the URL.
	if (to.name === 'oauth.authorize') {
		return {
			name: 'user.login',
			hash: REDIRECT_HASH_PREFIX + to.fullPath,
		}
	}

	// Fold the hash destination into localStorage: it's the only bridge that survives the
	// external OIDC round-trip out of the SPA, so redirectIfSaved() works after any auth method.
	// vue-router already decoded to.hash once, so it equals the fullPath we wrote above as-is.
	if (to.hash.startsWith(REDIRECT_HASH_PREFIX)) {
		const destination = to.hash.slice(REDIRECT_HASH_PREFIX.length)
		const resolved = router.resolve(destination)
		saveLastVisited(resolved.name as string, resolved.params, resolved.query)
	}

	// Check if the route the user wants to go to is a route which needs authentication. We use this to
	// redirect the user after successful login.
	const isValidUserAppRoute = !AUTH_ROUTE_NAMES.has(to.name as string) &&
		localStorage.getItem('emailConfirmToken') === null

	if (isValidUserAppRoute) {
		saveLastVisited(to.name as string, to.params, to.query)
	}

	if (isValidUserAppRoute) {
		return {name: 'user.login'}
	}
	
	if(localStorage.getItem('emailConfirmToken') !== null && to.name !== 'user.login') {
		return {name: 'user.login', query: to.query}
	}
}

router.beforeEach(async (to, from) => {
	const authStore = useAuthStore()

	await authStore.checkAuth()

	if (to.meta?.requiresAdminPanel) {
		// Await config/auth hydration so the license check doesn't race the empty default
		// on direct /admin navigation. appReady resolves without waiting on router.isReady(),
		// so awaiting it here doesn't deadlock the initial navigation.
		const baseStore = useBaseStore()
		await baseStore.appReady
		const configStore = useConfigStore()
		const featureOn = configStore.isProFeatureEnabled(PRO_FEATURE.ADMIN_PANEL)
		// isAdmin comes from /user, not the JWT; force-fetch in case checkAuth() was debounced.
		if (authStore.info?.is_admin === undefined) {
			await authStore.refreshUserInfo()
		}
		const isAdmin = authStore.info?.is_admin === true
		if (!featureOn || !isAdmin) {
			return {name: 'not-found'}
		}
	}

	if (to.meta?.requiresUserInvites) {
		const baseStore = useBaseStore()
		await baseStore.appReady
		const configStore = useConfigStore()
		if (!configStore.isProFeatureEnabled(PRO_FEATURE.USER_INVITES)) {
			return {name: 'not-found'}
		}
	}

	if (to.meta?.requiresTimeTracking) {
		const baseStore = useBaseStore()
		await baseStore.appReady
		const configStore = useConfigStore()
		if (!configStore.isProFeatureEnabled(PRO_FEATURE.TIME_TRACKING)) {
			return {name: 'not-found'}
		}
	}

	if(from.hash && from.hash.startsWith(LINK_SHARE_HASH_PREFIX)) {
		to.hash = from.hash
	}

	if (to.hash.startsWith(LINK_SHARE_HASH_PREFIX) && !authStore.authLinkShare) {
		saveLastVisited(to.name as string, to.params, to.query)
		return {
			name: 'link-share.auth',
			params: {
				share: to.hash.replace(LINK_SHARE_HASH_PREFIX, ''),
			},
		}
	}

	const newRoute = await getAuthForRoute(to, authStore)
	if(newRoute) {
		// A string target (the decoded redirect destination for an authed browser) already
		// carries its own query/path and no redirect hash, so navigate to it verbatim — don't
		// re-attach to.hash or it would re-enter the redirect loop.
		if (typeof newRoute === 'string') {
			return newRoute
		}
		return {
			hash: to.hash,
			...newRoute,
		}
	}

	// to.fullPath keeps the redirect hash url-encoded while to.hash is decoded, so the endsWith
	// check below never matches and would re-append the hash forever. The hash is already on the
	// URL here, so skip the re-attach (#2654).
	if (to.hash.startsWith(REDIRECT_HASH_PREFIX)) {
		return
	}

	if(!to.fullPath.endsWith(to.hash)) {
		return to.fullPath + to.hash
	}
})

export default router
