import {computed, ref, watch, type Ref} from 'vue'
import {useEventListener} from '@vueuse/core'

const DECIDE_DISTANCE = 8
// Past the trigger distance the row follows the finger at a quarter of the speed.
const RESISTANCE = 0.25

/**
 * Horizontal swipe actions for a list row on touch screens: past `threshold` pixels,
 * letting go runs the action for that side. Vertical movement is left to the page
 * scroll, so the row needs `touch-action: pan-y` (the `touch-pan-y` utility).
 *
 * `style` is the row's live offset; `armed` turns true once letting go would act.
 */
export function useSwipeAction(options: {
	target: Ref<HTMLElement | null | undefined>
	enabled: Ref<boolean>
	onSwipeRight?: () => void
	onSwipeLeft?: () => void
	threshold?: number
}) {
	const threshold = options.threshold ?? 72
	const offset = ref(0)
	const swiping = ref(false)
	const settling = ref(false)

	let startX = 0
	let startY = 0
	let tracking = false
	let pointerId: number | null = null
	// A swipe ends with a click on whatever is under the finger; that click must not open the task.
	let suppressClick = false

	const direction = computed<'left' | 'right' | null>(() => offset.value > 0 ? 'right' : offset.value < 0 ? 'left' : null)
	const armed = computed(() => Math.abs(offset.value) >= threshold)

	watch(armed, isArmed => {
		if (isArmed && swiping.value) {
			navigator.vibrate?.(8)
		}
	})

	function follow(dx: number): number {
		if ((dx > 0 && !options.onSwipeRight) || (dx < 0 && !options.onSwipeLeft)) {
			return 0
		}
		const distance = Math.abs(dx)
		const eased = distance <= threshold ? distance : threshold + (distance - threshold) * RESISTANCE
		return Math.sign(dx) * eased
	}

	function reset() {
		tracking = false
		pointerId = null
		swiping.value = false
		settling.value = true
		offset.value = 0
	}

	useEventListener(options.target, 'pointerdown', (event: PointerEvent) => {
		if (!options.enabled.value || event.pointerType !== 'touch' || !event.isPrimary) {
			return
		}
		startX = event.clientX
		startY = event.clientY
		tracking = true
		pointerId = event.pointerId
		settling.value = false
	})

	useEventListener(options.target, 'pointermove', (event: PointerEvent) => {
		if (!tracking || event.pointerId !== pointerId) {
			return
		}
		const dx = event.clientX - startX
		const dy = event.clientY - startY
		if (!swiping.value) {
			if (Math.abs(dy) > DECIDE_DISTANCE && Math.abs(dy) >= Math.abs(dx)) {
				tracking = false
				return
			}
			if (Math.abs(dx) <= DECIDE_DISTANCE) {
				return
			}
			swiping.value = true
			options.target.value?.setPointerCapture(event.pointerId)
		}
		offset.value = follow(dx)
	})

	function finish() {
		if (!tracking) {
			return
		}
		const wasSwiping = swiping.value
		const action = armed.value ? (offset.value > 0 ? options.onSwipeRight : options.onSwipeLeft) : undefined
		reset()
		if (wasSwiping) {
			suppressClick = true
			setTimeout(() => suppressClick = false, 0)
		}
		action?.()
	}

	useEventListener(options.target, 'pointerup', finish)
	useEventListener(options.target, 'pointercancel', reset)
	useEventListener(options.target, 'click', (event: MouseEvent) => {
		if (suppressClick) {
			event.preventDefault()
			event.stopPropagation()
		}
	}, {capture: true})

	const style = computed(() => ({
		transform: offset.value === 0 ? undefined : `translateX(${offset.value}px)`,
		transition: settling.value ? 'transform var(--duration-base) var(--ease-out)' : undefined,
	}))

	return {offset, swiping, armed, direction, style}
}
