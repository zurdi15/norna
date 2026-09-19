<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute, useRouter} from 'vue-router'

import {oauthAuthorize} from '@/client/generated'
import {useTitle} from '@/composables/useTitle'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import {getDisplayName} from '@/modules/user/displayName'
import {getErrorText} from '@/message'
import {useAuthStore} from '@/stores/auth'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'

/**
 * An app (the desktop client, a phone app, a local tool) asks for access to the
 * account through OAuth with PKCE. Nothing is granted until the person allows it here;
 * then the app gets its code at the address it registered.
 */
const {t} = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
useTitle(() => t('oauth.title'))

const REQUIRED = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method'] as const

function param(name: string): string | undefined {
	const value = route.query[name]
	return typeof value === 'string' && value !== '' ? value : undefined
}

const missing = computed(() => REQUIRED.filter(name => param(name) === undefined))
const clientId = computed(() => param('client_id') ?? '')

// Where the app listens: a local address, or the app's own scheme.
const destination = computed(() => {
	try {
		const url = new URL(param('redirect_uri') ?? '')
		return url.host ? `${url.protocol}//${url.host}` : url.protocol
	} catch {
		return param('redirect_uri') ?? ''
	}
})

const state = ref<'asking' | 'authorizing' | 'redirected'>('asking')
const errorMessage = ref('')

async function allow() {
	state.value = 'authorizing'
	errorMessage.value = ''
	try {
		const {data} = await oauthAuthorize({body: {
			response_type: param('response_type'),
			client_id: param('client_id'),
			redirect_uri: param('redirect_uri'),
			state: param('state'),
			code_challenge: param('code_challenge'),
			code_challenge_method: param('code_challenge_method'),
		}})
		if (!data.code || !data.redirect_uri) {
			throw new Error(t('oauth.failed'))
		}
		const target = new URL(data.redirect_uri)
		target.searchParams.set('code', data.code)
		if (data.state) {
			target.searchParams.set('state', data.state)
		}
		state.value = 'redirected'
		window.location.href = target.toString()
	} catch (cause) {
		errorMessage.value = getErrorText(cause)
		state.value = 'asking'
	}
}

// Declining leads home, never to the requested address: nothing has checked it yet.
function decline() {
	void router.replace({name: 'home'})
}
</script>

<template>
	<AuthLayout
		:title="state === 'redirected' ? t('oauth.redirectedTitle') : t('oauth.title')"
		:description="state === 'redirected' ? t('oauth.redirectedDescription') : undefined"
	>
		<UiAlert
			v-if="missing.length"
			tone="danger"
		>
			{{ t('oauth.missingParams', {params: missing.join(', ')}) }}
		</UiAlert>
		<div
			v-else-if="state !== 'redirected'"
			class="grid gap-6"
		>
			<p class="text-pretty text-ink-muted">
				{{ t('oauth.question', {user: authStore.info ? getDisplayName(authStore.info) : ''}) }}
			</p>
			<dl class="grid gap-3 rounded-lg border border-line bg-surface p-4">
				<div class="grid gap-0.5">
					<dt class="caption">
						{{ t('oauth.app') }}
					</dt>
					<dd class="font-mono text-sm break-all">
						{{ clientId }}
					</dd>
				</div>
				<div class="grid gap-0.5">
					<dt class="caption">
						{{ t('oauth.destination') }}
					</dt>
					<dd class="font-mono text-sm break-all">
						{{ destination }}
					</dd>
				</div>
			</dl>
			<p class="text-sm text-pretty text-ink-muted">
				{{ t('oauth.grants') }}
			</p>
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>
			<div class="grid gap-2">
				<UiButton
					variant="primary"
					size="lg"
					block
					:loading="state === 'authorizing'"
					@click="allow"
				>
					{{ t('oauth.allow') }}
				</UiButton>
				<UiButton
					variant="ghost"
					size="lg"
					block
					:disabled="state === 'authorizing'"
					@click="decline"
				>
					{{ t('oauth.decline') }}
				</UiButton>
			</div>
		</div>
	</AuthLayout>
</template>
