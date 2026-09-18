import {i18n} from '@/i18n'
import {toast, type ExternalToast} from 'vue-sonner'

interface ErrorBody {
	code?: number
	message?: string
	detail?: string
	i18n_params?: Record<string, string>
}

// Everything an error can arrive as: a v1 axios error, an unhandled rejection event,
// a v2 problem+json body, or an Error wrapping one of those as its cause.
interface ErrorLike extends ErrorBody {
	reason?: {response?: {data?: ErrorBody}}
	response?: {data?: ErrorBody}
	cause?: ErrorBody & {response?: {data?: ErrorBody}}
}

// A narrow signature for i18n's t(): the generic one makes TypeScript give up on
// the message schema here (TS2589).
const translate = (key: string, params?: Record<string, unknown>): string =>
	(i18n.global as unknown as {t: (key: string, params?: Record<string, unknown>) => string}).t(key, params)

// Error codes whose translation is generic enough that the server detail helps.
const CODES_WITH_DETAIL = [4016, 4017, 4018, 4019, 4024]

export function getErrorText(error: unknown): string {
	if (typeof error === 'string') {
		return error
	}

	const r = (error ?? {}) as ErrorLike
	const data: ErrorBody = r.reason?.response?.data || r.response?.data || r

	if (data.code) {
		const path = `error.${data.code}`
		let message = translate(path, data.i18n_params ?? {})

		if (data.message && CODES_WITH_DETAIL.includes(data.code)) {
			message += '\n' + data.message
		}

		// If message and path are equal no translation exists for that error code
		if (path !== message) {
			return message
		}
	}

	// v2 errors are RFC 9457 problem+json, which carries `detail` instead of `message`.
	let message = data.message || data.detail || r.message

	const causeMessage = r.cause?.response?.data?.message ?? r.cause?.detail ?? r.cause?.message
	if (typeof causeMessage !== 'undefined') {
		message += ' ' + causeMessage
	}

	return message || translate('error.error')
}

export function translatedError(key: string): Error {
	return new Error(translate(key))
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

export function error(e: unknown, actions: Action[] = []) {
	const text = getErrorText(e)
	toast.error(text, toastOptions(text, actions))
}

export function success(e: unknown, actions: Action[] = []) {
	const text = getErrorText(e)
	toast.success(text, toastOptions(text, actions))
}
