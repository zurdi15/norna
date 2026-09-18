<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {
	createWebhookDraft,
	useCreateProjectWebhookMutation,
	useDeleteProjectWebhookMutation,
	useUpdateProjectWebhookMutation,
} from '@/client/queries/projectWebhooks'
import {PERMISSIONS} from '@/constants/permissions'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import {useProjectWebhooks, useWebhookEvents, type ProjectWebhook} from '@/features/webhooks/useProjectWebhooks'
import WebhookForm from '@/features/webhooks/WebhookForm.vue'
import WebhookRow from '@/features/webhooks/WebhookRow.vue'
import {useConfigStore} from '@/stores/config'
import {confirm} from '@/ui/confirm'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
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

const creating = ref(false)
const draft = ref(createWebhookDraft())
const editingId = ref<number | null>(null)

// The secret typed for one project must not follow the user to another.
watch(() => props.projectId, () => {
	creating.value = false
	draft.value = createWebhookDraft()
	editingId.value = null
})

function startCreating() {
	editingId.value = null
	creating.value = true
}

function cancelCreating() {
	creating.value = false
	draft.value = createWebhookDraft()
}

async function submit() {
	const projectId = props.projectId
	try {
		await create.mutateAsync({projectId, webhook: draft.value})
	} catch {
		return
	} finally {
		// Drops the secret and the basic-auth password from the mutation cache.
		create.reset()
	}
	if (projectId === props.projectId) {
		cancelCreating()
	}
}

function startEditing(webhook: ProjectWebhook) {
	creating.value = false
	editingId.value = webhook.id
}

async function saveEvents(webhook: ProjectWebhook, selected: string[]) {
	const id = webhook.id
	try {
		await update.mutateAsync({projectId: props.projectId, id, target_url: webhook.target_url, events: selected})
	} catch {
		return
	}
	if (editingId.value === id) {
		editingId.value = null
	}
}

async function removeWebhook(webhook: ProjectWebhook) {
	const projectId = props.projectId
	const confirmed = await confirm({
		title: t('projectWebhooks.deleteTitle'),
		description: t('projectWebhooks.deleteDescription', {url: webhook.target_url}),
		confirmLabel: t('projectWebhooks.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId, id: webhook.id})
	}
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
			<WebhookForm
				v-if="creating"
				v-model="draft"
				:events="events"
				:events-loading="eventsPending"
				:loading="create.isPending.value"
				@submit="submit"
				@cancel="cancelCreating"
			/>
			<section
				v-if="webhooks.length"
				class="grid gap-1"
			>
				<UiSectionHeading
					:title="t('projectWebhooks.listTitle')"
					:count="webhooks.length"
				>
					<template
						v-if="canWrite && !creating"
						#actions
					>
						<UiButton
							variant="ghost"
							size="sm"
							:icon="Plus"
							class="-me-2 pointer-coarse:h-11"
							@click="startCreating"
						>
							{{ t('projectWebhooks.new') }}
						</UiButton>
					</template>
				</UiSectionHeading>
				<ul
					role="list"
					class="divide-y divide-line"
				>
					<WebhookRow
						v-for="webhook in webhooks"
						:key="webhook.id"
						:webhook="webhook"
						:events="events"
						:events-loading="eventsPending"
						:editable="canWrite"
						:editing="editingId === webhook.id"
						:saving="update.isPending.value && update.variables.value?.id === webhook.id"
						@edit="startEditing(webhook)"
						@cancel="editingId = null"
						@save="selected => saveEvents(webhook, selected)"
						@remove="removeWebhook(webhook)"
					/>
				</ul>
			</section>
			<UiEmptyState
				v-else-if="!creating"
				:title="t('projectWebhooks.emptyTitle')"
				:description="canWrite ? t('projectWebhooks.emptyDescription') : undefined"
				class="py-8"
			>
				<template
					v-if="canWrite"
					#actions
				>
					<UiButton
						variant="primary"
						:icon="Plus"
						@click="startCreating"
					>
						{{ t('projectWebhooks.new') }}
					</UiButton>
				</template>
			</UiEmptyState>
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
