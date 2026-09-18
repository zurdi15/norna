import {computed, shallowRef, watch} from 'vue'
import {
	loadRouteLocation,
	useRoute,
	useRouter,
	type RouteLocationNormalizedLoaded,
	type RouteLocationRaw,
} from 'vue-router'

declare module 'vue-router' {
	interface RouteMeta {
		// Opens as a dialog over the page it was linked from (settings, create forms).
		modal?: boolean
		// The translation key naming the page (tab title, dialog title).
		title?: string
		// Renders on its own, without the app's navigation, though it still needs a session.
		bare?: boolean
	}
}

export type BackdropKind = 'panel' | 'modal'

/** Whether the route on screen opens over another page: a task beside it, a settings dialog on top. */
function backdropKind(route: RouteLocationNormalizedLoaded): BackdropKind | null {
	if (route.name === 'task.detail') {
		return 'panel'
	}
	return route.meta.modal ? 'modal' : null
}

/**
 * The page a task or a dialog route was opened from. It travels in history.state
 * (see useBackdropLink), so the shell keeps rendering it underneath; closing goes
 * back to it. Opened straight from a link, such routes simply show as pages.
 */
export function useRouteBackdrop() {
	const route = useRoute()
	const router = useRouter()

	const kind = computed(() => backdropKind(route))
	// history.state is already the new entry's when the route changes, so reading it here is current.
	const backdropPath = computed<string | undefined>(() => kind.value && route.fullPath
		? window.history.state?.backdropView
		: undefined)

	const backdrop = shallowRef<RouteLocationNormalizedLoaded | null>(null)

	watch(backdropPath, async path => {
		if (!path) {
			backdrop.value = null
			return
		}
		// A backdrop restored after a reload may point at a page whose code isn't loaded yet.
		const location = await loadRouteLocation(router.resolve(path))
		if (backdropPath.value === path) {
			backdrop.value = location as RouteLocationNormalizedLoaded
		}
	}, {immediate: true})

	function close() {
		const path = backdropPath.value
		if (!path) {
			void router.push({name: 'home'})
		} else if (window.history.state?.back === path) {
			router.back()
		} else {
			void router.push(path)
		}
	}

	return {kind, backdrop, backdropPath, close}
}

/**
 * A link that opens over the current page. From a page that is itself open over
 * another (a task in the panel), the original page stays the backdrop and the entry
 * is replaced, so moving between tasks doesn't pile up history.
 */
export function useBackdropLink() {
	const route = useRoute()

	return <T extends Exclude<RouteLocationRaw, string>>(location: T): T => {
		const layered = backdropKind(route) !== null
		const backdropView: string | undefined = layered ? window.history.state?.backdropView : route.fullPath
		return {
			...location,
			state: backdropView ? {backdropView} : undefined,
			replace: layered && backdropView !== undefined,
		}
	}
}
