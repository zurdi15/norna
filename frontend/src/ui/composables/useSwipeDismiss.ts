import {computed, ref, type Ref} from 'vue'
import {useEventListener} from '@vueuse/core'

const START_THRESHOLD = 6
const DISMISS_RATIO = 0.3
const DISMISS_VELOCITY = 0.6 // px per ms

/**
 * Lets the user drag a bottom sheet down to dismiss it.
 *
 * - `handle` (grabber and header) drags with any pointer; it needs `touch-action: none`.
 * - `scroller` drags only while it is scrolled to the top and the finger moves down,
 *   so reading a long sheet still scrolls normally.
 *
 * Returns the inline style for the sheet: its live offset while dragging, and a short
 * spring back when released above the dismiss threshold.
 */
export function useSwipeDismiss(options: {
	sheet: Ref<HTMLElement | null | undefined>
	handle: Ref<HTMLElement | null | undefined>
	scroller: Ref<HTMLElement | null | undefined>
	enabled: Ref<boolean>
	onDismiss: () => void
}) {
	const offset = ref(0)
	const dragging = ref(false)
	const settling = ref(false)

	let startY = 0
	let startTime = 0
	let tracking = false

	function begin(y: number) {
		startY = y
		startTime = performance.now()
		tracking = true
	}

	// Returns true once the gesture is a sheet drag, so the caller can stop the scroll.
	function move(y: number): boolean {
		if (!tracking) {
			return false
		}
		const dy = y - startY
		if (!dragging.value) {
			if (dy < -START_THRESHOLD) {
				tracking = false
				return false
			}
			if (dy < START_THRESHOLD) {
				return false
			}
			dragging.value = true
			settling.value = false
		}
		offset.value = Math.max(0, dy)
		return true
	}

	function end() {
		if (!tracking) {
			return
		}
		tracking = false
		if (!dragging.value) {
			return
		}
		dragging.value = false
		const height = options.sheet.value?.offsetHeight ?? window.innerHeight
		const velocity = offset.value / Math.max(1, performance.now() - startTime)
		if (offset.value > height * DISMISS_RATIO || velocity > DISMISS_VELOCITY) {
			// Keep the offset: the exit animation continues from where the finger let go.
			options.onDismiss()
			return
		}
		settling.value = true
		offset.value = 0
	}

	useEventListener(options.handle, 'pointerdown', (event: PointerEvent) => {
		if (!options.enabled.value || event.button !== 0) {
			return
		}
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
		begin(event.clientY)
	})
	useEventListener(options.handle, 'pointermove', (event: PointerEvent) => move(event.clientY))
	useEventListener(options.handle, 'pointerup', end)
	useEventListener(options.handle, 'pointercancel', end)

	useEventListener(options.scroller, 'touchstart', (event: TouchEvent) => {
		const scroller = options.scroller.value
		if (!options.enabled.value || !scroller || scroller.scrollTop > 0 || event.touches.length !== 1) {
			return
		}
		begin(event.touches[0]!.clientY)
	}, {passive: true})
	useEventListener(options.scroller, 'touchmove', (event: TouchEvent) => {
		if (move(event.touches[0]!.clientY)) {
			event.preventDefault()
		}
	}, {passive: false})
	useEventListener(options.scroller, 'touchend', end)
	useEventListener(options.scroller, 'touchcancel', end)

	function reset() {
		offset.value = 0
		dragging.value = false
		settling.value = false
		tracking = false
	}

	const style = computed(() => {
		if (offset.value === 0 && !settling.value) {
			return undefined
		}
		return {
			transform: `translateY(${offset.value}px)`,
			transition: settling.value ? 'transform var(--duration-base) var(--ease-out)' : 'none',
		}
	})

	return {style, dragging, reset}
}
