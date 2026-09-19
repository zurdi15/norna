<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'

import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'

import WebhookEventsPicker from './WebhookEventsPicker.vue'

/** Changes the events of an existing webhook; its url, secret and credentials are fixed. */
const props = defineProps<{
	initial: string[]
	events: string[]
	eventsLoading: boolean
	saving: boolean
}>()

const emit = defineEmits<{
	save: [events: string[]]
	cancel: []
}>()

const {t} = useI18n()

// eslint-disable-next-line vue/no-setup-props-reactivity-loss -- seeded once: a refetch must not undo the picking.
const selected = ref([...props.initial])
const touched = ref(false)
const error = computed(() => touched.value && selected.value.length === 0 ? t('projectWebhooks.eventsRequired') : undefined)

function save() {
	touched.value = true
	if (!error.value) {
		emit('save', selected.value)
	}
}
</script>

<template>
	<form
		class="grid gap-3"
		@submit.prevent="save"
	>
		<UiField
			:label="t('projectWebhooks.events')"
			:error="error"
			hide-label
		>
			<WebhookEventsPicker
				v-model="selected"
				:events="events"
				:loading="eventsLoading"
			/>
		</UiField>
		<div class="flex flex-wrap justify-end gap-2">
			<UiButton
				variant="ghost"
				@click="emit('cancel')"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				variant="primary"
				:loading="saving"
			>
				{{ t('projectSettings.save') }}
			</UiButton>
		</div>
	</form>
</template>
