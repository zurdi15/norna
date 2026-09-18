<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {WebhookDraft} from '@/client/queries/projectWebhooks'
import {
	useCreateUserWebhookMutation,
	useDeleteUserWebhookMutation,
	useUpdateUserWebhookMutation,
} from '@/client/queries/userWebhooks'
import LoadFailedAlert from '@/features/settings/integrations/LoadFailedAlert.vue'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {useUserWebhookEvents, useUserWebhooks, type ListedWebhook} from '@/features/webhooks/useWebhooks'
import WebhookTargets from '@/features/webhooks/WebhookTargets.vue'
import {useConfigStore} from '@/stores/config'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** The user's own webhooks: a POST request for their reminders and overdue tasks, from every project. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const enabled = computed(() => configStore.webhooks_enabled)

const list = useUserWebhooks(enabled)
const {events, isPending: eventsPending} = useUserWebhookEvents(enabled)

const create = useCreateUserWebhookMutation()
const update = useUpdateUserWebhookMutation()
const remove = useDeleteUserWebhookMutation()

async function createWebhook(webhook: WebhookDraft) {
	try {
		await create.mutateAsync(webhook)
	} finally {
		// Drops the secret and the basic-auth password from the mutation cache.
		create.reset()
	}
}

function saveEvents(webhook: ListedWebhook, selected: string[]) {
	return update.mutateAsync({id: webhook.id, target_url: webhook.target_url, events: selected})
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.webhooks')"
		:description="t('settingsIntegrations.webhooks.description')"
	>
		<UiEmptyState
			v-if="!enabled"
			:title="t('projectWebhooks.disabledTitle')"
			:description="t('projectWebhooks.disabledDescription')"
			class="py-8"
		/>
		<div
			v-else-if="list.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-14" />
			<UiSkeleton class="h-14" />
		</div>
		<LoadFailedAlert
			v-else-if="list.isError.value"
			@retry="list.refetch()"
		/>
		<WebhookTargets
			v-else
			:webhooks="list.webhooks.value"
			:events="events"
			:events-loading="eventsPending"
			:empty-description="t('settingsIntegrations.webhooks.emptyDescription')"
			:create-pending="create.isPending.value"
			:saving-id="update.isPending.value ? update.variables.value?.id : undefined"
			:create="createWebhook"
			:save-events="saveEvents"
			:remove="webhook => remove.mutate(webhook.id)"
		/>
	</SettingsPage>
</template>
