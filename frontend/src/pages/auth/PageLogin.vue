<script setup lang="ts">
import {computed, nextTick, onBeforeMount, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {LogIn} from '@lucide/vue'

import {useRedirectToLastVisited} from '@/composables/useRedirectToLastVisited'
import {useTitle} from '@/composables/useTitle'
import {REDIRECT_HASH_PREFIX} from '@/constants/redirectHash'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {isDesktopApp} from '@/helpers/desktopAuth'
import {getAutoRedirectProvider, redirectToProvider} from '@/helpers/redirectToProvider'
import {getErrorText} from '@/message'
import {problemCode} from '@/modules/api/problem'
import {JUST_LOGGED_OUT_KEY, useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

const TOTP_REQUIRED = 1017

const {t} = useI18n()
useTitle(() => t('auth.login.title'))

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const configStore = useConfigStore()
const {redirectIfSaved} = useRedirectToLastVisited()

const localAuth = computed(() => configStore.auth.local.enabled)
const ldapAuth = computed(() => configStore.auth.ldap.enabled)
const passwordLogin = computed(() => localAuth.value || ldapAuth.value)
const registrationEnabled = computed(() => configStore.auth.local.enabled && configStore.auth.local.registration_enabled)
const providers = computed(() => configStore.auth.openid_connect.enabled ? configStore.auth.openid_connect.providers : [])

const username = ref('')
const password = ref('')
const totpPasscode = ref('')
const rememberMe = ref(false)
const errorMessage = ref('')
const emailConfirmed = ref(false)
const usernameError = ref('')
const passwordError = ref('')

const usernameInput = ref<InstanceType<typeof UiInput> | null>(null)
const passwordInput = ref<InstanceType<typeof PasswordInput> | null>(null)
const totpInput = ref<InstanceType<typeof UiInput> | null>(null)

const needsTotp = computed(() => authStore.needsTotpPasscode)
const loading = computed(() => authStore.isLoading)

onBeforeMount(() => {
	authStore.verifyEmail()
		.then(confirmed => emailConfirmed.value = confirmed)
		.catch((e: Error) => errorMessage.value = e.message)

	// router.push, not redirectIfSaved(): this also runs when the page re-mounts right
	// after a successful login, and redirectIfSaved() would consume the saved route
	// before submit() gets to use it.
	if (authStore.authenticated) {
		router.push({name: 'home'})
		return
	}

	// Consumed on read so the next visit can auto-redirect again.
	const justLoggedOut = sessionStorage.getItem(JUST_LOGGED_OUT_KEY) !== null
	sessionStorage.removeItem(JUST_LOGGED_OUT_KEY)

	const provider = getAutoRedirectProvider({
		localAuthEnabled: localAuth.value,
		ldapAuthEnabled: ldapAuth.value,
		openIdEnabled: configStore.auth.openid_connect.enabled,
		providers: providers.value,
		isDesktopApp: isDesktopApp(),
		justLoggedOut,
		hasCopyableRedirect: route.hash.startsWith(REDIRECT_HASH_PREFIX),
	})
	if (provider) {
		redirectToProvider(provider)
	}
})

async function submit() {
	errorMessage.value = ''
	// Autofilled values don't always reach v-model; read what the fields actually hold.
	const user = usernameInput.value?.input?.value ?? username.value
	const pass = passwordInput.value?.readValue() ?? password.value
	// Kept for the TOTP step, where these fields are no longer rendered.
	username.value = user
	password.value = pass
	usernameError.value = user === '' ? t('auth.login.usernameRequired') : ''
	passwordError.value = pass === '' ? t('auth.login.passwordRequired') : ''
	if (usernameError.value || passwordError.value) {
		return
	}

	try {
		await authStore.login({
			username: user,
			password: pass,
			long_token: rememberMe.value,
			totp_passcode: needsTotp.value ? totpPasscode.value : undefined,
		})
		authStore.setNeedsTotpPasscode(false)
		redirectIfSaved()
	} catch (e) {
		if (problemCode(e) === TOTP_REQUIRED && !totpPasscode.value) {
			await nextTick()
			totpInput.value?.focus()
			return
		}
		errorMessage.value = getErrorText(e)
	}
}
</script>

<template>
	<AuthLayout
		:title="needsTotp ? t('auth.login.totpTitle') : t('auth.login.title')"
		:description="needsTotp ? t('auth.login.totpDescription') : t('auth.login.description')"
	>
		<div class="grid gap-5">
			<UiAlert
				v-if="emailConfirmed"
				tone="success"
			>
				{{ t('auth.login.emailConfirmed') }}
			</UiAlert>
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>

			<form
				v-if="passwordLogin"
				class="grid gap-4"
				novalidate
				@submit.prevent="submit"
			>
				<template v-if="!needsTotp">
					<UiField
						:label="ldapAuth && !localAuth ? t('auth.login.username') : t('auth.login.usernameOrEmail')"
						:error="usernameError || undefined"
					>
						<UiInput
							ref="usernameInput"
							v-model="username"
							name="username"
							autocomplete="username"
							autocapitalize="none"
							spellcheck="false"
							required
							autofocus
						/>
					</UiField>
					<UiField
						:label="t('auth.password')"
						:error="passwordError || undefined"
					>
						<PasswordInput
							ref="passwordInput"
							v-model="password"
							name="password"
							autocomplete="current-password"
							required
						/>
					</UiField>
					<div class="flex items-center justify-between gap-3">
						<UiCheckbox v-model="rememberMe">
							{{ t('auth.login.remember') }}
						</UiCheckbox>
						<RouterLink
							v-if="localAuth"
							:to="{name: 'user.password-reset.request'}"
							class="text-sm text-accent hover:underline"
						>
							{{ t('auth.login.forgotPassword') }}
						</RouterLink>
					</div>
				</template>
				<UiField
					v-else
					:label="t('auth.login.totpCode')"
				>
					<UiInput
						ref="totpInput"
						v-model="totpPasscode"
						name="totp"
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
					:loading="loading"
					:icon="LogIn"
				>
					{{ needsTotp ? t('auth.login.verify') : t('auth.login.submit') }}
				</UiButton>
			</form>

			<template v-if="providers.length && !needsTotp">
				<div
					v-if="passwordLogin"
					class="flex items-center gap-3 caption"
				>
					<span class="thread" />{{ t('auth.or') }}<span class="thread" />
				</div>
				<div class="grid gap-2">
					<UiButton
						v-for="provider in providers"
						:key="provider.key"
						block
						size="lg"
						@click="redirectToProvider(provider)"
					>
						{{ t('auth.login.withProvider', {provider: provider.name}) }}
					</UiButton>
				</div>
			</template>

			<p
				v-if="registrationEnabled && !needsTotp"
				class="text-center text-sm text-ink-muted"
			>
				{{ t('auth.login.noAccount') }}
				<RouterLink
					:to="{name: 'user.register'}"
					class="font-medium text-accent hover:underline"
				>
					{{ t('auth.login.createAccount') }}
				</RouterLink>
			</p>
		</div>
	</AuthLayout>
</template>
