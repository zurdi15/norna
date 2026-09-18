<script setup lang="ts">
import {computed, reactive, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Import} from '@lucide/vue'

import type {MigrationCredentials} from '@/client/queries/migration'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSegmented from '@/ui/UiSegmented.vue'

import type {Migrator} from './migrators'

/**
 * Where the other server is and how to sign in to it: an API key, or a username and
 * password. The server checks them before the import starts and doesn't keep them.
 */
const props = withDefaults(defineProps<{
	migrator: Extract<Migrator, {kind: 'credentials'}>
	loading?: boolean
	error?: string
}>(), {
	loading: false,
	error: undefined,
})

const emit = defineEmits<{
	submit: [credentials: MigrationCredentials]
}>()

type Method = 'token' | 'password'

const {t, te} = useI18n()

const method = ref<Method>('token')
const fields = reactive({url: '', token: '', username: '', password: ''})
const errors = reactive<Partial<Record<keyof typeof fields, string>>>({})

const methods = computed(() => [
	{value: 'token' as const, label: t('migration.credentials.apiKey')},
	{value: 'password' as const, label: t('migration.credentials.login')},
])

// Service specific advice, e.g. where Planka's API keys come from.
function hint(kind: 'apiKeyHint' | 'passwordHint'): string | undefined {
	const key = `migration.credentials.${props.migrator.i18nKey}.${kind}`
	return te(key) ? t(key) : undefined
}

function isUrl(value: string): boolean {
	try {
		return ['http:', 'https:'].includes(new URL(value).protocol)
	} catch {
		return false
	}
}

function validate(): boolean {
	const url = fields.url.trim()
	errors.url = url === ''
		? t('migration.credentials.urlRequired')
		: (isUrl(url) ? undefined : t('migration.credentials.urlInvalid'))
	errors.token = method.value === 'token' && fields.token.trim() === '' ? t('migration.credentials.apiKeyRequired') : undefined
	errors.username = method.value === 'password' && fields.username.trim() === '' ? t('migration.credentials.usernameRequired') : undefined
	errors.password = method.value === 'password' && fields.password === '' ? t('migration.credentials.passwordRequired') : undefined
	return !Object.values(errors).some(Boolean)
}

function submit() {
	if (props.loading || !validate()) {
		return
	}
	const url = fields.url.trim()
	emit('submit', method.value === 'token'
		? {url, token: fields.token.trim()}
		: {url, username: fields.username.trim(), password: fields.password})
}
</script>

<template>
	<form
		class="grid gap-4"
		novalidate
		@submit.prevent="submit"
	>
		<p class="text-sm text-pretty text-ink-muted">
			{{ t('migration.credentials.description', {name: migrator.name}) }}
		</p>
		<UiField
			:label="t('migration.credentials.url', {name: migrator.name})"
			:error="errors.url"
		>
			<UiInput
				v-model="fields.url"
				type="url"
				inputmode="url"
				autocomplete="url"
				spellcheck="false"
				:placeholder="`https://${migrator.id}.example.com`"
				class="font-mono"
				@input="errors.url = undefined"
			/>
		</UiField>
		<div class="grid gap-1.5">
			<p
				class="text-sm font-medium"
				aria-hidden="true"
			>
				{{ t('migration.credentials.method') }}
			</p>
			<UiSegmented
				v-model="method"
				:items="methods"
				:label="t('migration.credentials.method')"
				class="justify-self-start"
			/>
		</div>
		<UiField
			v-if="method === 'token'"
			:label="t('migration.credentials.apiKey')"
			:hint="hint('apiKeyHint')"
			:error="errors.token"
		>
			<PasswordInput
				v-model="fields.token"
				autocomplete="off"
				spellcheck="false"
				class="font-mono"
				@input="errors.token = undefined"
			/>
		</UiField>
		<template v-else>
			<UiField
				:label="t('migration.credentials.username')"
				:error="errors.username"
			>
				<UiInput
					v-model="fields.username"
					autocomplete="off"
					autocapitalize="none"
					spellcheck="false"
					@input="errors.username = undefined"
				/>
			</UiField>
			<UiField
				:label="t('migration.credentials.password')"
				:hint="hint('passwordHint')"
				:error="errors.password"
			>
				<PasswordInput
					v-model="fields.password"
					autocomplete="off"
					@input="errors.password = undefined"
				/>
			</UiField>
		</template>
		<UiAlert
			v-if="error"
			tone="danger"
		>
			{{ error }}
		</UiAlert>
		<div class="flex md:justify-end">
			<UiButton
				type="submit"
				variant="primary"
				:icon="Import"
				:loading="loading"
				class="max-md:w-full"
			>
				{{ t('migration.start') }}
			</UiButton>
		</div>
	</form>
</template>
