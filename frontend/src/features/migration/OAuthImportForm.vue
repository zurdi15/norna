<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {LogIn} from '@lucide/vue'

import {useMigrationAuthUrl} from '@/client/queries/migration'
import {getErrorText} from '@/message'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'

import type {Migrator} from './migrators'

/** Sends the user to the other service to allow the import; it sends them back here with a code. */
const props = defineProps<{
	migrator: Extract<Migrator, {kind: 'oauth'}>
	// Why the last attempt didn't start.
	error?: string
}>()

const {t} = useI18n()
const authUrl = useMigrationAuthUrl(() => props.migrator.id)
const authError = computed(() => authUrl.error.value ? getErrorText(authUrl.error.value) : '')
</script>

<template>
	<div class="grid gap-4">
		<p class="text-sm text-pretty text-ink-muted">
			{{ t('migration.oauth.description', {name: migrator.name}) }}
		</p>
		<UiAlert
			v-if="error || authError"
			tone="danger"
		>
			{{ error || authError }}
		</UiAlert>
		<div class="flex md:justify-end">
			<UiButton
				as="a"
				:href="authUrl.data.value || undefined"
				variant="primary"
				:icon="LogIn"
				:loading="authUrl.isPending.value"
				:disabled="!authUrl.data.value"
				class="max-md:w-full"
			>
				{{ t('migration.oauth.connect', {name: migrator.name}) }}
			</UiButton>
		</div>
	</div>
</template>
