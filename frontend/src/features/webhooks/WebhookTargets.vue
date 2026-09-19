<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {createWebhookDraft, type WebhookDraft} from '@/client/queries/projectWebhooks'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

import type {ListedWebhook} from './useWebhooks'
import WebhookForm from './WebhookForm.vue'
import WebhookRow from './WebhookRow.vue'

/**
 * A list of webhooks with the form for a new one, for any owner (a project, the user):
 * the owner's page passes the events on offer and what creating, saving and deleting do.
 * Remount it (`key`) when the owner changes so a typed secret doesn't follow along.
 */
const props = withDefaults(defineProps<{
	webhooks: ListedWebhook[]
	events: string[]
	eventsLoading?: boolean
	editable?: boolean
	emptyDescription?: string
	createPending?: boolean
	savingId?: number
	// Resolves once created; rejects (already reported) when it fails.
	create: (draft: WebhookDraft) => Promise<unknown>
	saveEvents: (webhook: ListedWebhook, events: string[]) => Promise<unknown>
	remove: (webhook: ListedWebhook) => void
}>(), {
	eventsLoading: false,
	editable: true,
	emptyDescription: undefined,
	createPending: false,
	savingId: undefined,
})

const {t} = useI18n()

const creating = ref(false)
const draft = ref(createWebhookDraft())
const editingId = ref<number | null>(null)

function startCreating() {
	editingId.value = null
	creating.value = true
}

function cancelCreating() {
	creating.value = false
	draft.value = createWebhookDraft()
}

async function submit() {
	try {
		await props.create(draft.value)
	} catch {
		return
	}
	cancelCreating()
}

function startEditing(webhook: ListedWebhook) {
	creating.value = false
	editingId.value = webhook.id
}

async function save(webhook: ListedWebhook, selected: string[]) {
	const id = webhook.id
	try {
		await props.saveEvents(webhook, selected)
	} catch {
		return
	}
	if (editingId.value === id) {
		editingId.value = null
	}
}

async function removeWebhook(webhook: ListedWebhook) {
	const confirmed = await confirm({
		title: t('projectWebhooks.deleteTitle'),
		description: t('projectWebhooks.deleteDescription', {url: webhook.target_url}),
		confirmLabel: t('projectWebhooks.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		props.remove(webhook)
	}
}
</script>

<template>
	<div class="grid gap-5">
		<WebhookForm
			v-if="creating"
			v-model="draft"
			:events="events"
			:events-loading="eventsLoading"
			:loading="createPending"
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
					v-if="editable && !creating"
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
					:events-loading="eventsLoading"
					:editable="editable"
					:editing="editingId === webhook.id"
					:saving="savingId === webhook.id"
					@edit="startEditing(webhook)"
					@cancel="editingId = null"
					@save="selected => save(webhook, selected)"
					@remove="removeWebhook(webhook)"
				/>
			</ul>
		</section>
		<UiEmptyState
			v-else-if="!creating"
			:title="t('projectWebhooks.emptyTitle')"
			:description="editable ? emptyDescription : undefined"
			class="py-8"
		>
			<template
				v-if="editable"
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
</template>
