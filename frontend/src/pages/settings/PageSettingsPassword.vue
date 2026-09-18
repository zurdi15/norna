<script setup lang="ts">
import {computed, reactive, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {KeyRound} from '@lucide/vue'

import {useChangePasswordMutation} from '@/client/queries/user'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {useLocalAccount} from '@/features/settings/account/useLocalAccount'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {validatePassword} from '@/helpers/validatePassword'
import {getErrorText, success} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'

/**
 * Changes the password with the same rules as registration. The server then signs out
 * every session; this one signs straight back in with the new password.
 */
defineOptions({inheritAttrs: false})

const WRONG_PASSWORD = 1011

const {t} = useI18n()
const authStore = useAuthStore()
const {isLocal, provider} = useLocalAccount()
const change = useChangePasswordMutation()

const form = reactive({current: '', next: '', repeat: ''})
const touched = reactive({current: false, next: false, repeat: false})
const serverErrors = reactive<{current?: string, form?: string}>({})

const errors = computed(() => {
	const nextProblem = validatePassword(form.next)
	return {
		current: (touched.current && form.current === '' ? t('settingsAccount.passwordRequired') : undefined) ?? serverErrors.current,
		next: touched.next && nextProblem !== true ? t(nextProblem) : undefined,
		repeat: touched.repeat && form.repeat !== form.next ? t('settingsAccount.password.mismatch') : undefined,
	}
})
const valid = computed(() => form.current !== '' && validatePassword(form.next) === true && form.repeat === form.next)

const signingIn = ref(false)

async function submit() {
	touched.current = touched.next = touched.repeat = true
	delete serverErrors.current
	delete serverErrors.form
	if (!valid.value) {
		return
	}
	const password = form.next
	try {
		await change.mutateAsync({old_password: form.current, new_password: password})
	} catch (e) {
		if (problemCode(e) === WRONG_PASSWORD) {
			serverErrors.current = t('settingsAccount.wrongPassword')
		} else {
			serverErrors.form = getErrorText(e)
		}
		return
	} finally {
		// Drops both passwords from the mutation cache.
		change.reset()
	}

	form.current = form.next = form.repeat = ''
	touched.current = touched.next = touched.repeat = false
	signingIn.value = true
	try {
		await authStore.login({username: authStore.info?.username ?? '', password})
		success({message: t('settingsAccount.password.changed')})
	} catch {
		// A second factor (or anything else) needs the sign-in page, from its first step:
		// the password typed here doesn't travel there.
		authStore.setNeedsTotpPasscode(false)
		success({message: t('settingsAccount.password.signInAgain')})
		await authStore.logout()
	} finally {
		signingIn.value = false
	}
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.password')"
		:description="t('settingsAccount.password.description')"
	>
		<UiAlert
			v-if="!isLocal"
			tone="info"
		>
			{{ t('settingsAccount.managedByProvider', {provider}) }}
		</UiAlert>
		<SettingsSection
			v-else
			:title="t('settingsAccount.password.changeTitle')"
		>
			<form
				class="grid gap-4 py-4 md:max-w-sm"
				novalidate
				@submit.prevent="submit"
			>
				<UiAlert
					v-if="serverErrors.form"
					tone="danger"
				>
					{{ serverErrors.form }}
				</UiAlert>
				<!-- Lets password managers match the new password to this account. -->
				<input
					type="text"
					name="username"
					autocomplete="username"
					:value="authStore.info?.username"
					class="sr-only"
					tabindex="-1"
					aria-hidden="true"
					readonly
				>
				<UiField
					:label="t('settingsAccount.currentPassword')"
					:error="errors.current"
				>
					<PasswordInput
						v-model="form.current"
						autocomplete="current-password"
						@blur="touched.current = true"
						@input="delete serverErrors.current"
					/>
				</UiField>
				<UiField
					:label="t('settingsAccount.password.new')"
					:hint="t('auth.register.passwordHint')"
					:error="errors.next"
				>
					<PasswordInput
						v-model="form.next"
						autocomplete="new-password"
						@blur="touched.next = true"
					/>
				</UiField>
				<UiField
					:label="t('settingsAccount.password.repeat')"
					:error="errors.repeat"
				>
					<PasswordInput
						v-model="form.repeat"
						autocomplete="new-password"
						@blur="touched.repeat = true"
					/>
				</UiField>
				<div>
					<UiButton
						type="submit"
						variant="primary"
						:icon="KeyRound"
						:loading="change.isPending.value || signingIn"
					>
						{{ t('settingsAccount.password.submit') }}
					</UiButton>
				</div>
			</form>
		</SettingsSection>
	</SettingsPage>
</template>
