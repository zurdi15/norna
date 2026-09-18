import {computed, shallowRef, watch} from 'vue'
import {loadRouteLocation, useRoute, useRouter, type RouteLocationNormalizedLoaded} from 'vue-router'

/**
 * The page a task was opened from (see useTaskLink). Wide screens keep rendering it
 * behind the detail panel; closing the panel goes back to it.
 */
export function useTaskBackdrop() {
	const route = useRoute()
	const router = useRouter()

	// history.state is already the new entry's when the route changes, so reading it here is current.
	const backdropPath = computed<string | undefined>(() => route.name === 'task.detail' && route.fullPath
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

	return {backdrop, backdropPath, close}
}
