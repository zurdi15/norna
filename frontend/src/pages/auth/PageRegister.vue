<script setup lang="ts">
import {computed, onBeforeMount, onUnmounted, reactive, ref, toRaw} from 'vue'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {UserPlus} from '@lucide/vue'

import type {PublicInviteLink} from '@/client/generated'
import {checkInviteLink, hasInviteLink, onInviteLinkChange} from '@/client/inviteLink'
import {useRedirectToLastVisited} from '@/composables/useRedirectToLastVisited'
import {useTitle} from '@/composables/useTitle'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {isEmail} from '@/helpers/isEmail'
import {parseValidationErrors} from '@/helpers/parseValidationErrors'
import {validatePassword} from '@/helpers/validatePassword'
import {problemCode, problemStatus} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

const INVITE_INVALID = 2005
const EMAIL_NOT_CONFIRMED = 1012

const {t} = useI18n()
useTitle(() => t('auth.register.title'))

const router = useRouter()
const authStore = useAuthStore()
const configStore = useConfigStore()
const {redirectIfSaved} = useRedirectToLastVisited()

type InviteState = {status: 'none' | 'loading' | 'invalid' | 'error'} | {status: 'ready', link: PublicInviteLink}
const invite = ref<InviteState>({status: hasInviteLink() ? 'loading' : 'none'})
let inviteCheck = 0

async function loadInvite() {
	if (!hasInviteLink()) {
		invite.value = {status: 'none'}
		return
	}
	const check = ++inviteCheck
	invite.value = {status: 'loading'}
	try {
		const {data: link} = await checkInviteLink()
		if (check === inviteCheck) {
			invite.value = {status: 'ready', link}
		}
	} catch (e) {
		if (check === inviteCheck) {
			invite.value = {status: problemStatus(e) === 404 ? 'invalid' : 'error'}
		}
	}
}

onBeforeMount(() => {
	if (authStore.authenticated) {
		router.push({name: 'home'})
		return
	}
	loadInvite()
})
const stopWatchingInvite = onInviteLinkChange(loadInvite)
onUnmounted(() => {
	inviteCheck++
	stopWatchingInvite()
})

const viaInvite = computed(() => invite.value.status !== 'none')
const registrationOpen = computed(() => viaInvite.value || (configStore.auth.local.enabled && configStore.auth.local.registration_enabled))
const inviteTeams = computed(() => invite.value.status === 'ready'
	? (invite.value.link.teams ?? []).map(team => team.name).filter(Boolean).join(', ')
	: '')

const credentials = reactive({
	username: '',
	email: '',
	password: '',
})
const touched = reactive({
	username: false,
	email: false,
	password: false,
})
const serverErrors = ref<Record<string, string>>({})
const errorMessage = ref('')
const confirmEmail = ref(false)

function usernameProblem(username: string): string | undefined {
	if (username === '') {
		return t('auth.register.usernameRequired')
	}
	if (username.includes(' ')) {
		return t('auth.register.usernameNoSpaces')
	}
	if (username.includes('://') || username.includes('.')) {
		return t('auth.register.usernameNotUrl')
	}
	return undefined
}

const errors = computed(() => {
	const passwordProblem = validatePassword(credentials.password)
	return {
		username: (touched.username ? usernameProblem(credentials.username) : undefined) ?? serverErrors.value.username,
		email: (touched.email && !isEmail(credentials.email) ? t('auth.register.emailInvalid') : undefined) ?? serverErrors.value.email,
		password: (touched.password && passwordProblem !== true ? t(passwordProblem) : undefined) ?? serverErrors.value.password,
	}
})

const valid = computed(() => usernameProblem(credentials.username) === undefined
	&& isEmail(credentials.email)
	&& validatePassword(credentials.password) === true)

async function submit() {
	errorMessage.value = ''
	serverErrors.value = {}
	touched.username = touched.email = touched.password = true
	if (!valid.value || (viaInvite.value && invite.value.status !== 'ready')) {
		return
	}

	try {
		if (viaInvite.value) {
			await authStore.registerWithInvite(toRaw(credentials))
		} else {
			await authStore.register(toRaw(credentials))
		}
		redirectIfSaved()
	} catch (e) {
		if (viaInvite.value && problemCode(e) === INVITE_INVALID) {
			invite.value = {status: 'invalid'}
			return
		}
		// Registration itself succeeded; logging in waits for the confirmation link.
		if (problemCode(e) === EMAIL_NOT_CONFIRMED) {
			confirmEmail.value = true
			return
		}
		const fieldErrors = parseValidationErrors(e as never)
		if (Object.keys(fieldErrors).length > 0) {
			serverErrors.value = fieldErrors
			return
		}
		const message = (e as {message?: unknown})?.message
		errorMessage.value = typeof message === 'string' ? message : t('auth.register.failed')
	}
}
</script>

<template>
	<AuthLayout
		:title="t('auth.register.title')"
		:description="viaInvite ? t('auth.register.inviteDescription') : t('auth.register.description')"
	>
		<UiAlert
			v-if="confirmEmail"
			tone="success"
		>
			{{ t('auth.register.confirmEmail') }}
		</UiAlert>
		<UiAlert
			v-else-if="!registrationOpen"
			tone="info"
		>
			{{ t('auth.register.disabled') }}
		</UiAlert>
		<div
			v-else-if="invite.status === 'loading'"
			class="grid gap-3"
		>
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-9" />
		</div>
		<UiAlert
			v-else-if="invite.status === 'invalid' || invite.status === 'error'"
			tone="danger"
		>
			{{ invite.status === 'invalid' ? t('auth.register.inviteInvalid') : t('auth.register.inviteFailed') }}
		</UiAlert>
		<form
			v-else
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiAlert
				v-if="inviteTeams"
				tone="info"
			>
				{{ t('auth.register.inviteTeams', {teams: inviteTeams}) }}
			</UiAlert>
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>
			<UiField
				:label="t('auth.register.username')"
				:error="errors.username"
			>
				<UiInput
					v-model="credentials.username"
					name="username"
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					required
					autofocus
					@blur="touched.username = true"
					@input="delete serverErrors.username"
				/>
			</UiField>
			<UiField
				:label="t('auth.register.email')"
				:error="errors.email"
			>
				<UiInput
					v-model="credentials.email"
					name="email"
					type="email"
					inputmode="email"
					autocomplete="email"
					required
					@blur="touched.email = true"
					@input="delete serverErrors.email"
				/>
			</UiField>
			<UiField
				:label="t('auth.password')"
				:hint="t('auth.register.passwordHint')"
				:error="errors.password"
			>
				<PasswordInput
					v-model="credentials.password"
					name="password"
					autocomplete="new-password"
					required
					@blur="touched.password = true"
					@input="delete serverErrors.password"
				/>
			</UiField>
			<UiButton
				type="submit"
				variant="primary"
				size="lg"
				block
				:loading="authStore.isLoading"
				:icon="UserPlus"
			>
				{{ t('auth.register.submit') }}
			</UiButton>
		</form>
		<p class="mt-6 text-center text-sm text-ink-muted">
			{{ t('auth.register.haveAccount') }}
			<RouterLink
				:to="{name: 'user.login'}"
				class="font-medium text-accent hover:underline"
			>
				{{ t('auth.register.login') }}
			</RouterLink>
		</p>
	</AuthLayout>
</template>
