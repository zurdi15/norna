<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {KeyRound} from '@lucide/vue'

import type {WebhookDraft} from '@/client/queries/projectWebhooks'
import {isValidHttpUrl} from '@/helpers/isValidHttpUrl'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

import WebhookEventsPicker from './WebhookEventsPicker.vue'

/** A new webhook: where to send, on which events and, optionally, how to sign or authenticate. */
defineProps<{
	events: string[]
	eventsLoading: boolean
	loading: boolean
}>()

const emit = defineEmits<{
	submit: []
	cancel: []
}>()

const model = defineModel<WebhookDraft>({required: true})

const {t} = useI18n()

function field<K extends keyof WebhookDraft>(key: K) {
	return computed({
		get: () => model.value[key],
		set: (value: WebhookDraft[K]) => model.value = {...model.value, [key]: value},
	})
}

const targetUrl = field('target_url')
const selectedEvents = field('events')
const secret = field('secret')
const basicAuthUser = field('basic_auth_user')
const basicAuthPassword = field('basic_auth_password')

const showBasicAuth = ref(false)
const touched = ref(false)
const urlTouched = ref(false)

const urlError = computed(() => (touched.value || urlTouched.value) && !isValidHttpUrl(model.value.target_url.trim())
	? t('projectWebhooks.targetUrlInvalid')
	: undefined)
const eventsError = computed(() => touched.value && model.value.events.length === 0
	? t('projectWebhooks.eventsRequired')
	: undefined)
// The server only authenticates when both halves are set.
const basicAuthError = computed(() => touched.value && Boolean(model.value.basic_auth_user) !== Boolean(model.value.basic_auth_password)
	? t('projectWebhooks.basicAuthIncomplete')
	: undefined)

function submit() {
	touched.value = true
	if (!urlError.value && !eventsError.value && !basicAuthError.value) {
		emit('submit')
	}
}
</script>

<template>
	<form
		class="grid gap-4 rounded-lg border border-line bg-canvas-subtle p-4"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('projectWebhooks.targetUrl')"
			:error="urlError"
			required
		>
			<UiInput
				v-model="targetUrl"
				data-autofocus
				type="url"
				inputmode="url"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				placeholder="https://example.com/hook"
				class="font-mono"
				@blur="urlTouched = targetUrl !== ''"
			/>
		</UiField>
		<UiField
			:label="t('projectWebhooks.events')"
			:hint="t('projectWebhooks.eventsHint')"
			:error="eventsError"
			required
		>
			<WebhookEventsPicker
				v-model="selectedEvents"
				:events="events"
				:loading="eventsLoading"
			/>
		</UiField>
		<UiField
			:label="t('projectWebhooks.secret')"
			:hint="t('projectWebhooks.secretHint')"
		>
			<UiInput
				v-model="secret"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				class="font-mono"
			/>
		</UiField>
		<div
			v-if="showBasicAuth"
			class="grid gap-4 sm:grid-cols-2"
		>
			<UiField
				:label="t('projectWebhooks.basicAuthUser')"
				:error="basicAuthError"
			>
				<UiInput
					v-model="basicAuthUser"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
				/>
			</UiField>
			<UiField :label="t('projectWebhooks.basicAuthPassword')">
				<UiInput
					v-model="basicAuthPassword"
					type="password"
					autocomplete="new-password"
				/>
			</UiField>
		</div>
		<UiButton
			v-else
			variant="ghost"
			size="sm"
			:icon="KeyRound"
			class="-ms-2 -mt-2 justify-self-start pointer-coarse:h-10"
			@click="showBasicAuth = true"
		>
			{{ t('projectWebhooks.addBasicAuth') }}
		</UiButton>
		<div class="flex flex-wrap items-center justify-end gap-2">
			<UiButton
				variant="ghost"
				@click="emit('cancel')"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				variant="primary"
				:loading="loading"
			>
				{{ t('projectWebhooks.create') }}
			</UiButton>
		</div>
	</form>
</template>
