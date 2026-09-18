<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {ShieldCheck, ShieldOff} from '@lucide/vue'

import {
	totpStatusQuery,
	useDisableTotpMutation,
	useEnableTotpMutation,
	useEnrollTotpMutation,
} from '@/client/queries/totp'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import TotpSetup from '@/features/settings/account/TotpSetup.vue'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {getErrorText, success} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/**
 * Two-factor sign-in with an authenticator app: set up (enroll, then confirm a code),
 * and off again with the password. Local accounts only; the route checks it.
 */
defineOptions({inheritAttrs: false})

const WRONG_PASSWORD = 1011
const INVALID_PASSCODE = 1017
const PASSCODE_USED = 1039

const {t} = useI18n()
const authStore = useAuthStore()

const status = useQuery(totpStatusQuery())
const enroll = useEnrollTotpMutation()
const enable = useEnableTotpMutation()
const disable = useDisableTotpMutation()

const state = computed(() => status.data.value?.state)
const secret = computed(() => status.data.value?.state === 'pending' ? status.data.value.secret : '')

// A pending setup from an earlier visit shows its steps straight away.
const settingUp = ref(false)
watch(state, value => settingUp.value = value === 'pending', {immediate: true})

function startSetup() {
	if (state.value === 'pending') {
		settingUp.value = true
		return
	}
	enroll.mutate(undefined, {onSuccess: () => settingUp.value = true})
}

const codeError = ref<string>()

async function confirm(passcode: string) {
	codeError.value = undefined
	try {
		await enable.mutateAsync(passcode)
	} catch (e) {
		const code = problemCode(e)
		codeError.value = code === INVALID_PASSCODE || code === PASSCODE_USED
			? t('settingsAccount.totp.codeWrong')
			: getErrorText(e)
		return
	} finally {
		enable.reset()
	}
	// Every session ended on the server, this one too.
	success({message: t('settingsAccount.totp.enabled')})
	await authStore.logout()
}

// Turning it off
const disableOpen = ref(false)
const password = ref('')
const passwordError = ref<string>()

watch(disableOpen, open => {
	if (!open) {
		password.value = ''
		passwordError.value = undefined
	}
})

async function turnOff() {
	passwordError.value = undefined
	if (password.value === '') {
		passwordError.value = t('settingsAccount.passwordRequired')
		return
	}
	try {
		await disable.mutateAsync(password.value)
	} catch (e) {
		passwordError.value = problemCode(e) === WRONG_PASSWORD ? t('settingsAccount.wrongPassword') : getErrorText(e)
		return
	} finally {
		// Drops the password from the mutation cache.
		disable.reset()
	}
	disableOpen.value = false
	success({message: t('settingsAccount.totp.disabled')})
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.totp')"
		:description="t('settingsAccount.totp.description')"
	>
		<div
			v-if="status.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-4 w-32" />
			<UiSkeleton class="h-14" />
		</div>
		<UiAlert
			v-else-if="status.isError.value"
			tone="danger"
		>
			{{ getErrorText(status.error.value) }}
		</UiAlert>
		<template v-else>
			<SettingsSection :title="t('settingsAccount.totp.status')">
				<div class="flex items-center gap-3 py-3">
					<span
						class="grid size-8 shrink-0 place-items-center rounded-md"
						:class="state === 'on' ? 'bg-success-subtle text-success' : 'bg-canvas-subtle text-ink-muted'"
					>
						<UiIcon :icon="state === 'on' ? ShieldCheck : ShieldOff" />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-base text-ink pointer-coarse:text-md">
							{{ state === 'on' ? t('settingsAccount.totp.on') : state === 'pending' ? t('settingsAccount.totp.pending') : t('settingsAccount.totp.off') }}
						</p>
						<p class="mt-0.5 text-sm text-pretty text-ink-muted">
							{{ state === 'on' ? t('settingsAccount.totp.onDescription') : t('settingsAccount.totp.offDescription') }}
						</p>
					</div>
					<UiButton
						v-if="state === 'on'"
						variant="danger"
						class="shrink-0"
						@click="disableOpen = true"
					>
						{{ t('settingsAccount.totp.turnOff') }}
					</UiButton>
					<UiButton
						v-else-if="!settingUp"
						variant="primary"
						:loading="enroll.isPending.value"
						class="shrink-0"
						@click="startSetup"
					>
						{{ state === 'pending' ? t('settingsAccount.totp.continueSetup') : t('settingsAccount.totp.setUp') }}
					</UiButton>
				</div>
			</SettingsSection>
			<SettingsSection
				v-if="settingUp && secret"
				:title="t('settingsAccount.totp.setupTitle')"
			>
				<TotpSetup
					:secret="secret"
					:confirming="enable.isPending.value"
					:error="codeError"
					@confirm="confirm"
					@input="codeError = undefined"
				/>
			</SettingsSection>
		</template>
		<UiDialog
			v-model:open="disableOpen"
			:title="t('settingsAccount.totp.disableTitle')"
			:description="t('settingsAccount.totp.disableDescription')"
			size="sm"
		>
			<form
				id="totp-disable"
				novalidate
				@submit.prevent="turnOff"
			>
				<UiField
					:label="t('settingsAccount.currentPassword')"
					:error="passwordError"
				>
					<PasswordInput
						v-model="password"
						autocomplete="current-password"
						data-autofocus
						@input="passwordError = undefined"
					/>
				</UiField>
			</form>
			<template #footer>
				<UiButton
					variant="ghost"
					@click="disableOpen = false"
				>
					{{ t('ui.cancel') }}
				</UiButton>
				<UiButton
					type="submit"
					form="totp-disable"
					variant="danger"
					:loading="disable.isPending.value"
				>
					{{ t('settingsAccount.totp.turnOff') }}
				</UiButton>
			</template>
		</UiDialog>
	</SettingsPage>
</template>
