import {onMounted, type Ref} from 'vue'
import {useMutationObserver, useResizeObserver} from '@vueuse/core'

// The desktop app's quick entry window is this wide (desktop/main.js, QUICK_ENTRY_WIDTH).
const WIDTH = 680
const MAX_HEIGHT = Math.round(window.screen.availHeight * 0.7)
// Popovers and sheets opened from the composer live outside it.
const FLOATING = '[data-reka-popper-content-wrapper], [role="dialog"], [role="alertdialog"]'

/**
 * Keeps the desktop app's frameless quick entry window as tall as what it shows: the
 * card, and anything floating over it (a picker needs the room to open). The window is
 * transparent, so only the card is ever seen.
 */
export function useQuickEntryWindow(card: Ref<HTMLElement | null>) {
	let last = 0
	let frame = 0

	function measure() {
		frame = 0
		const floating = [...document.querySelectorAll<HTMLElement>(FLOATING)]
			.filter(element => !card.value?.contains(element))
		// A sheet sits at the bottom of the window: it needs the full height to show.
		const height = floating.some(element => element.matches('[role="dialog"], [role="alertdialog"]'))
			? MAX_HEIGHT
			: Math.max(card.value?.getBoundingClientRect().bottom ?? 0, ...floating.map(element => element.getBoundingClientRect().bottom))
		const next = Math.min(Math.ceil(height), MAX_HEIGHT)
		if (next > 0 && next !== last) {
			last = next
			window.quickEntry?.resize(WIDTH, next)
		}
	}

	function schedule() {
		if (!frame) {
			frame = requestAnimationFrame(measure)
		}
	}

	useResizeObserver(card, schedule)
	useMutationObserver(() => document.body, schedule, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-state']})
	onMounted(schedule)

	return {
		close: () => window.quickEntry?.close(),
		showMainWindow: () => window.quickEntry?.showMainWindow(),
	}
}
