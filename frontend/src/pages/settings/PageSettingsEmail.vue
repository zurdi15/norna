<script setup lang="ts">
import {computed, reactive, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Mail} from '@lucide/vue'

import {
	useCancelEmailUpdateMutation,
	useResendEmailConfirmationMutation,
	useUpdateEmailMutation,
} from '@/client/queries/user'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {useLocalAccount} from '@/features/settings/account/useLocalAccount'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {isEmail} from '@/helpers/isEmail'
import {getErrorText, success} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

/**
 * Changes the account's email after the password confirms it. With the mailer on the
 * new address waits for its confirmation link; until then it can be resent or dropped.
 */
defineOptions({inheritAttrs: false})

const WRONG_PASSWORD = 1011
const EMAIL_TAKEN = 1002

const {t} = useI18n()
const authStore = useAuthStore()
const {isLocal, provider} = useLocalAccount()

const update = useUpdateEmailMutation()
const resend = useResendEmailConfirmationMutation()
const cancel = useCancelEmailUpdateMutation()

const pendingEmail = computed(() => authStore.info?.pending_email)
const busy = computed(() => update.isPending.value || resend.isPending.value || cancel.isPending.value)

const form = reactive({email: '', password: ''})
const touched = ref(false)
const serverErrors = reactive<{email?: string, password?: string, form?: string}>({})

const errors = computed(() => ({
	email: (touched.value && !isEmail(form.email.trim()) ? t('auth.register.emailInvalid') : undefined) ?? serverErrors.email,
	password: (touched.value && form.password === '' ? t('settingsAccount.passwordRequired') : undefined) ?? serverErrors.password,
}))

function clearServerErrors() {
	delete serverErrors.email
	delete serverErrors.password
	delete serverErrors.form
}

async function submit() {
	touched.value = true
	clearServerErrors()
	if (errors.value.email || errors.value.password) {
		return
	}
	const email = form.email.trim()
	try {
		await update.mutateAsync({new_email: email, password: form.password})
	} catch (e) {
		const code = problemCode(e)
		if (code === WRONG_PASSWORD) {
			serverErrors.password = t('settingsAccount.wrongPassword')
		} else if (code === EMAIL_TAKEN) {
			serverErrors.email = getErrorText(e)
		} else {
			serverErrors.form = getErrorText(e)
		}
		return
	} finally {
		// Drops the password from the mutation cache.
		update.reset()
	}
	form.email = ''
	form.password = ''
	touched.value = false
	await authStore.refreshUserInfo()
	success({message: pendingEmail.value
		? t('settingsAccount.email.pendingSent', {email})
		: t('settingsAccount.email.changed')})
}

// A change confirmed or dropped in another tab fails here: the refresh shows where it stands.
async function resendConfirmation() {
	await resend.mutateAsync().catch(() => authStore.refreshUserInfo())
}

async function cancelChange() {
	await cancel.mutateAsync().catch(() => undefined)
	await authStore.refreshUserInfo()
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.email')"
		:description="t('settingsAccount.email.description')"
	>
		<UiAlert
			v-if="!isLocal"
			tone="info"
		>
			{{ t('settingsAccount.managedByProvider', {provider}) }}
		</UiAlert>
		<template v-else>
			<UiAlert
				v-if="pendingEmail"
				tone="warning"
			>
				<p>{{ t('settingsAccount.email.pending', {email: pendingEmail}) }}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<UiButton
						size="sm"
						:loading="resend.isPending.value"
						:disabled="busy && !resend.isPending.value"
						class="pointer-coarse:h-11"
						@click="resendConfirmation"
					>
						{{ t('settingsAccount.email.resend') }}
					</UiButton>
					<UiButton
						variant="ghost"
						size="sm"
						:loading="cancel.isPending.value"
						:disabled="busy && !cancel.isPending.value"
						class="pointer-coarse:h-11"
						@click="cancelChange"
					>
						{{ t('settingsAccount.email.cancel') }}
					</UiButton>
				</div>
			</UiAlert>
			<SettingsSection :title="t('settingsAccount.email.changeTitle')">
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
					<p
						v-if="authStore.info?.email"
						class="text-sm text-ink-muted"
					>
						{{ t('settingsAccount.email.current') }}
						<span class="font-mono text-ink">{{ authStore.info.email }}</span>
					</p>
					<UiField
						:label="t('settingsAccount.email.newEmail')"
						:error="errors.email"
					>
						<UiInput
							v-model="form.email"
							type="email"
							inputmode="email"
							autocomplete="email"
							autocapitalize="none"
							spellcheck="false"
							@input="delete serverErrors.email"
						/>
					</UiField>
					<UiField
						:label="t('settingsAccount.currentPassword')"
						:hint="t('settingsAccount.email.passwordHint')"
						:error="errors.password"
					>
						<PasswordInput
							v-model="form.password"
							autocomplete="current-password"
							@input="delete serverErrors.password"
						/>
					</UiField>
					<div>
						<UiButton
							type="submit"
							variant="primary"
							:icon="Mail"
							:loading="update.isPending.value"
							:disabled="busy && !update.isPending.value"
						>
							{{ t('settingsAccount.email.submit') }}
						</UiButton>
					</div>
				</form>
			</SettingsSection>
		</template>
	</SettingsPage>
</template>
