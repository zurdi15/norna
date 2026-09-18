import {watch} from 'vue'
import {createSharedComposable, tryOnMounted} from '@vueuse/core'
import {storeToRefs} from 'pinia'

import {useTimeTrackingStore} from '@/stores/timeTracking'
import {getFullBaseUrl} from '@/helpers/getFullBaseUrl'

const TRACKING_FAVICON = `${getFullBaseUrl()}images/icons/favicon-tracking-32x32.png`

// Swaps in a favicon with a small red dot in the lower left corner while a timer
// is running, so an active time tracking session is visible even when the tab
// isn't focused.
export const useTimeTrackingFavicon = createSharedComposable(() => {
	const {hasActiveTimer} = storeToRefs(useTimeTrackingStore())

	// index.html declares an .ico and an SVG icon and browsers prefer the SVG,
	// so every icon link has to be swapped, not just the first.
	const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'))
	const originals = links.map(link => ({
		href: link.getAttribute('href') ?? '/favicon.ico',
		type: link.getAttribute('type'),
	}))

	function update(active: boolean) {
		links.forEach((link, i) => {
			const original = originals[i]!
			link.href = active ? TRACKING_FAVICON : original.href
			if (active) {
				link.type = 'image/png'
			} else if (original.type === null) {
				link.removeAttribute('type')
			} else {
				link.type = original.type
			}
		})
	}

	watch(hasActiveTimer, update, {flush: 'post'})
	tryOnMounted(() => update(hasActiveTimer.value))
})
