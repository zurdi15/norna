import {computed, inject, nextTick, shallowRef, type WritableComputedRef} from 'vue'
import {
	routerViewLocationKey,
	useRoute,
	useRouter,
	type LocationQueryValue,
	type RouteLocationNormalizedLoaded,
	type Router,
} from 'vue-router'

/**
 * The route of the page a component belongs to. Behind a task panel or a dialog the
 * current route is the one on top, while the page still shows the route it was
 * opened from: RouterView hands that one down.
 */
export function useDisplayedRoute() {
	const route = useRoute()
	const shown = inject(routerViewLocationKey, null)
	const displayed = computed<RouteLocationNormalizedLoaded>(() => shown?.value ?? route)
	const isCurrent = computed(() => displayed.value.fullPath === route.fullPath)
	return {displayed, isCurrent}
}

type QueryValue = LocationQueryValue | LocationQueryValue[] | undefined

interface QueryWrite {
	displayed: RouteLocationNormalizedLoaded
	changes: Record<string, string | undefined>
}

// Writes made in the same tick land in one navigation, like vueuse's useRouteQuery.
// Until it lands readers see the written values, or the page's watchers would read
// the old ones and write them back. The version makes both maps reactive.
const queued = new WeakMap<Router, QueryWrite>()
const inFlight = new WeakMap<Router, QueryWrite>()
const writesVersion = shallowRef(0)

async function flush(router: Router) {
	const write = queued.get(router)
	if (!write) {
		return
	}
	queued.delete(router)
	inFlight.set(router, write)
	const query = {...write.displayed.query, ...write.changes}
	for (const key of Object.keys(query)) {
		if (query[key] === undefined) {
			delete query[key]
		}
	}
	try {
		// Behind a task panel this goes back to the page: what it shows is changing.
		await router.replace({path: write.displayed.path, query, hash: write.displayed.hash})
	} finally {
		if (inFlight.get(router) === write) {
			inFlight.delete(router)
		}
		writesVersion.value++
	}
}

/**
 * One query parameter of the displayed page (see useDisplayedRoute). Behind a task
 * panel it reads the page's own value, not the task's empty query.
 */
export function useDisplayedRouteQuery(name: string): WritableComputedRef<QueryValue, string | undefined> {
	const router = useRouter()
	const {displayed} = useDisplayedRoute()

	return computed({
		get: () => {
			void writesVersion.value
			for (const write of [queued.get(router), inFlight.get(router)]) {
				if (write && name in write.changes) {
					return write.changes[name]
				}
			}
			return displayed.value.query[name] ?? undefined
		},
		set: value => {
			const write = queued.get(router)
			if (!write && (inFlight.get(router)?.changes[name] ?? displayed.value.query[name] ?? undefined) === value) {
				return
			}
			writesVersion.value++
			if (write) {
				write.changes[name] = value
				return
			}
			queued.set(router, {displayed: displayed.value, changes: {[name]: value}})
			void nextTick(() => flush(router))
		},
	})
}
