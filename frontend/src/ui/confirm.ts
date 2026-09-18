import {shallowRef} from 'vue'

export interface ConfirmOptions {
	title: string
	description?: string
	confirmLabel: string
	cancelLabel?: string
	tone?: 'default' | 'danger'
}

interface PendingConfirm extends ConfirmOptions {
	resolve: (confirmed: boolean) => void
}

// One question at a time, rendered by UiConfirmHost (mounted once in App.vue).
export const pendingConfirm = shallowRef<PendingConfirm | null>(null)

/** Asks before an action that can't be undone. Resolves false when dismissed. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
	pendingConfirm.value?.resolve(false)
	return new Promise(resolve => {
		pendingConfirm.value = {...options, resolve}
	})
}

export function settleConfirm(confirmed: boolean) {
	const pending = pendingConfirm.value
	pendingConfirm.value = null
	pending?.resolve(confirmed)
}
