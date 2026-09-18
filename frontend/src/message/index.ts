import {i18n} from '@/i18n'
import {toast, type ExternalToast} from 'vue-sonner'

export function getErrorText(r): string {
	const data = r?.reason?.response?.data || r?.response?.data || r

	if (data?.code) {
		const path = `error.${data.code}`
		let message = i18n.global.t(path, data.i18n_params ?? {})

		if (data?.code && data?.message && (data.code === 4016 || data.code === 4017 || data.code === 4018 || data.code === 4019 || data.code === 4024)) {
			message += '\n' + data.message
		}

		// If message and path are equal no translation exists for that error code
		if (path !== message) {
			return message
		}
	}
	
	// v2 errors are RFC 9457 problem+json, which carries `detail` instead of `message`.
	let message = data?.message || data?.detail || r.message
	
	const causeMessage = r.cause?.response?.data?.message ?? r.cause?.message
	if (typeof causeMessage !== 'undefined') {
		message += ' ' + causeMessage
	}

	return message
}

export function translatedError(key: string): Error {
	return new Error(i18n.global.t(key))
}

export interface Action {
	title: string,
	callback: () => void,
}

// Sonner renders one primary action and one secondary (cancel) button.
function toastOptions(text: string, actions: Action[]): ExternalToast {
	const [primary, secondary] = actions
	return {
		// Same text, same id: sonner updates the visible toast instead of stacking a duplicate.
		id: text,
		action: primary ? {label: primary.title, onClick: primary.callback} : undefined,
		cancel: secondary ? {label: secondary.title, onClick: secondary.callback} : undefined,
	}
}

export function error(e, actions: Action[] = []) {
	const text = getErrorText(e)
	toast.error(text, toastOptions(text, actions))
}

export function success(e, actions: Action[] = []) {
	const text = getErrorText(e)
	toast.success(text, toastOptions(text, actions))
}
