import {onScopeDispose, ref} from 'vue'
import {createSharedComposable} from '@vueuse/core'

/**
 * Height of the on-screen keyboard covering the bottom of the layout viewport.
 *
 * Android Chrome resizes the layout viewport itself (interactive-widget=resizes-content
 * in index.html), so this stays 0 there; iOS Safari overlays the keyboard, and bottom
 * sheets use this to stay above it.
 */
export const useKeyboardInset = createSharedComposable(() => {
	const inset = ref(0)
	const viewport = window.visualViewport
	if (!viewport) {
		return inset
	}

	function update() {
		inset.value = Math.max(0, Math.round(window.innerHeight - viewport!.height - viewport!.offsetTop))
	}

	viewport.addEventListener('resize', update)
	viewport.addEventListener('scroll', update)
	update()
	onScopeDispose(() => {
		viewport.removeEventListener('resize', update)
		viewport.removeEventListener('scroll', update)
	})
	return inset
})
