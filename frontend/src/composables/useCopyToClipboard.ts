import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useTimeoutFn} from '@vueuse/core'

import {error} from '@/message'

export function useCopyToClipboard() {
	const {t} = useI18n({useScope: 'global'})
	
	function fallbackCopyTextToClipboard(text: string): boolean {
		const textArea = document.createElement('textarea')
		textArea.value = text
		
		// Avoid scrolling to bottom
		textArea.style.top = '0'
		textArea.style.left = '0'
		textArea.style.position = 'fixed'
	
		document.body.appendChild(textArea)
		textArea.focus()
		textArea.select()
	
		let copied: boolean
		try {
			// NOTE: the execCommand is deprecated but as of 2022_09
			// widely supported and works without https
			copied = document.execCommand('copy')
		} catch {
			copied = false
		}
		document.body.removeChild(textArea)
		if (!copied) {
			error(t('misc.copyError'))
		}
		return copied
	}

	// Resolves to whether the text made it to the clipboard; failures are reported here.
	return async (text: string): Promise<boolean> => {
		if (!navigator.clipboard) {
			return fallbackCopyTextToClipboard(text)
		}
		try {
			await navigator.clipboard.writeText(text)
			return true
		} catch {
			error(t('misc.copyError'))
			return false
		}
	}
}

/**
 * A copy button's feedback: `copied` turns true for a moment after a successful copy,
 * for the button to show a check instead of toasting.
 */
export function useCopyFeedback(duration = 1600) {
	const copyToClipboard = useCopyToClipboard()
	const copied = ref(false)
	const {start} = useTimeoutFn(() => copied.value = false, duration, {immediate: false})

	async function copy(text: string) {
		if (await copyToClipboard(text)) {
			copied.value = true
			start()
		}
	}

	return {copied, copy}
}
