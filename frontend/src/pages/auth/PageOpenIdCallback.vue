<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'

import {useRedirectToLastVisited} from '@/composables/useRedirectToLastVisited'
import {useTitle} from '@/composables/useTitle'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import {redirectToProvider} from '@/helpers/redirectToProvider'
import {getErrorText} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

const TOTP_REQUIRED = 1017

const {t} = useI18n()
useTitle(() => t('auth.openid.title'))

const route = useRoute()
const authStore = useAuthStore()
const configStore = useConfigStore()
const {redirectIfSaved} = useRedirectToLastVisited()

const providerKey = route.params.provider as string
const errorMessage = ref('')
const needsTotp = ref(false)
const totpPasscode = ref('')

// sessionStorage: per tab and gone on close, which is all the passcode needs to survive.
const pendingTotpKey = `openid_pending_totp_${providerKey}`

async function authenticate() {
	errorMessage.value = ''
	if (route.query.error !== undefined) {
		sessionStorage.removeItem(pendingTotpKey)
		errorMessage.value = typeof route.query.message === 'string' ? route.query.message : t('auth.openid.failed')
		return
	}
	if (route.query.state === undefined || route.query.state !== localStorage.getItem('state')) {
		sessionStorage.removeItem(pendingTotpKey)
		errorMessage.value = t('auth.openid.stateMismatch')
		return
	}

	const pendingPasscode = sessionStorage.getItem(pendingTotpKey) ?? undefined
	sessionStorage.removeItem(pendingTotpKey)
	try {
		await authStore.openIdAuth({
			provider: providerKey,
			code: route.query.code as string,
			totpPasscode: pendingPasscode,
		})
		redirectIfSaved()
	} catch (e) {
		if (problemCode(e) === TOTP_REQUIRED) {
			needsTotp.value = true
			return
		}
		errorMessage.value = getErrorText(e)
	}
}

// The authorization code is single use: stash the passcode and run the provider flow
// again, so the next callback sends both.
function submitTotp() {
	const provider = configStore.auth.openid_connect.providers.find(p => p.key === providerKey)
	if (!provider || !totpPasscode.value) {
		errorMessage.value = t('auth.openid.failed')
		return
	}
	sessionStorage.setItem(pendingTotpKey, totpPasscode.value)
	redirectToProvider(provider)
}

onMounted(authenticate)
</script>

<template>
	<AuthLayout
		:title="needsTotp ? t('auth.login.totpTitle') : t('auth.openid.title')"
		:description="needsTotp ? t('auth.openid.totpDescription') : undefined"
	>
		<div class="grid gap-4">
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>
			<form
				v-if="needsTotp"
				class="grid gap-4"
				@submit.prevent="submitTotp"
			>
				<UiField :label="t('auth.login.totpCode')">
					<UiInput
						v-model="totpPasscode"
						inputmode="numeric"
						autocomplete="one-time-code"
						pattern="[0-9]*"
						maxlength="6"
						class="font-mono tracking-[0.3em]"
						autofocus
					/>
				</UiField>
				<UiButton
					type="submit"
					variant="primary"
					size="lg"
					block
				>
					{{ t('auth.login.verify') }}
				</UiButton>
			</form>
			<p
				v-else-if="!errorMessage"
				class="flex items-center gap-2.5 text-ink-muted"
			>
				<UiSpinner />
				{{ t('auth.openid.working') }}
			</p>
			<RouterLink
				v-if="errorMessage"
				:to="{name: 'user.login'}"
				class="text-sm font-medium text-accent hover:underline"
			>
				{{ t('auth.reset.backToLogin') }}
			</RouterLink>
		</div>
	</AuthLayout>
</template>
