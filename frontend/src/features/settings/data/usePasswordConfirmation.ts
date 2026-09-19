import {computed, ref, type Ref} from 'vue'
import {useI18n} from 'vue-i18n'

import {error as showError} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'

const WRONG_PASSWORD = 1011

interface PasswordField {
	focus(): void
	readValue(): string
}

/**
 * The password local accounts confirm an export or a deletion with. Accounts signed in
 * through another provider have none to give, and the server doesn't ask them for it.
 */
export function usePasswordConfirmation() {
	const {t} = useI18n()
	const authStore = useAuthStore()

	const required = computed(() => authStore.info?.is_local_user === true)
	const password = ref('')
	const fieldError = ref<string>()
	const field: Ref<PasswordField | null> = ref(null)

	function complain(message: string) {
		fieldError.value = message
		field.value?.focus()
	}

	/** The password to send, or null when it is missing (and the field says so). */
	function take(): string | null {
		if (!required.value) {
			return ''
		}
		// Autofill can fill the field without an input event.
		const value = field.value?.readValue() ?? password.value
		if (value === '') {
			complain(t('settingsData.password.required'))
			return null
		}
		fieldError.value = undefined
		return value
	}

	/** A wrong password is told at the field; anything else in a toast. */
	function fail(cause: unknown) {
		if (problemCode(cause) === WRONG_PASSWORD) {
			complain(t('settingsData.password.wrong'))
			return
		}
		showError(cause)
	}

	function clear() {
		password.value = ''
		fieldError.value = undefined
	}

	return {required, password, fieldError, field, take, fail, clear}
}
