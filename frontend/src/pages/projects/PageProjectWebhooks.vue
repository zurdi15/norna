<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {
	useCreateProjectWebhookMutation,
	useDeleteProjectWebhookMutation,
	useUpdateProjectWebhookMutation,
	type WebhookDraft,
} from '@/client/queries/projectWebhooks'
import {PERMISSIONS} from '@/constants/permissions'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import {useProjectWebhooks, useWebhookEvents, type ListedWebhook} from '@/features/webhooks/useWebhooks'
import WebhookTargets from '@/features/webhooks/WebhookTargets.vue'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** HTTP callbacks for a project: other services hear about its changes as they happen. */
const props = withDefaults(defineProps<{
	projectId: number
	inModal?: boolean
}>(), {
	inModal: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const enabled = computed(() => configStore.webhooks_enabled)
const {project, isLoaded} = useProject(() => props.projectId)
useTitle(() => t('projectView.menu.webhooks'))

const canWrite = computed(() => (project.value.max_permission ?? 0) >= PERMISSIONS.READ_WRITE)
const {webhooks, isPending} = useProjectWebhooks(() => props.projectId, enabled)
const {events, isPending: eventsPending} = useWebhookEvents(() => enabled.value && canWrite.value)

const create = useCreateProjectWebhookMutation()
const update = useUpdateProjectWebhookMutation()
const remove = useDeleteProjectWebhookMutation()

async function createWebhook(webhook: WebhookDraft) {
	try {
		await create.mutateAsync({projectId: props.projectId, webhook})
	} finally {
		// Drops the secret and the basic-auth password from the mutation cache.
		create.reset()
	}
}

function saveEvents(webhook: ListedWebhook, selected: string[]) {
	return update.mutateAsync({projectId: props.projectId, id: webhook.id, target_url: webhook.target_url, events: selected})
}

// The webhook's own project: the confirmation may outlive a switch to another one.
function removeWebhook(webhook: ListedWebhook) {
	remove.mutate({projectId: webhook.project_id ?? props.projectId, id: webhook.id})
}
</script>

<template>
	<ModalPage
		:title="t('projectView.menu.webhooks')"
		:in-modal="inModal"
	>
		<UiEmptyState
			v-if="!enabled"
			:title="t('projectWebhooks.disabledTitle')"
			:description="t('projectWebhooks.disabledDescription')"
			class="py-8"
		/>
		<div
			v-else-if="!isLoaded || isPending"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-4 w-3/4" />
			<UiSkeleton class="h-14" />
			<UiSkeleton class="h-14" />
		</div>
		<div
			v-else
			class="grid gap-5"
		>
			<p class="text-base text-pretty text-ink-muted">
				{{ t('projectWebhooks.description', {project: project.title}) }}
			</p>
			<UiAlert
				v-if="!canWrite"
				tone="info"
			>
				{{ t('projectWebhooks.readOnly') }}
			</UiAlert>
			<!-- A secret typed for one project must not follow the user to another. -->
			<WebhookTargets
				:key="projectId"
				:webhooks="webhooks"
				:events="events"
				:events-loading="eventsPending"
				:editable="canWrite"
				:empty-description="t('projectWebhooks.emptyDescription')"
				:create-pending="create.isPending.value"
				:saving-id="update.isPending.value ? update.variables.value?.id : undefined"
				:create="createWebhook"
				:save-events="saveEvents"
				:remove="removeWebhook"
			/>
		</div>
		<template
			v-if="inModal"
			#actions
		>
			<UiButton
				variant="secondary"
				@click="emit('close')"
			>
				{{ t('ui.close') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
