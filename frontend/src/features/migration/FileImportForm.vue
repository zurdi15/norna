<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Import} from '@lucide/vue'

import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'

import ImportFilePicker from './ImportFilePicker.vue'
import type {Migrator} from './migrators'

/** An export file from the other service, picked and then sent. */
const props = withDefaults(defineProps<{
	migrator: Extract<Migrator, {kind: 'file'}>
	loading?: boolean
	error?: string
}>(), {
	loading: false,
	error: undefined,
})

const emit = defineEmits<{
	submit: [file: File]
}>()

const {t} = useI18n()
const file = ref<File | null>(null)

function submit() {
	if (file.value && !props.loading) {
		emit('submit', file.value)
	}
}
</script>

<template>
	<form
		class="grid gap-4"
		@submit.prevent="submit"
	>
		<p class="text-sm text-pretty text-ink-muted">
			{{ t(`migration.file.hints.${migrator.i18nKey}`) }}
		</p>
		<ImportFilePicker
			v-model="file"
			:accept="migrator.accept"
		/>
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
				:disabled="!file"
				:loading="loading"
				class="max-md:w-full"
			>
				{{ t('migration.start') }}
			</UiButton>
		</div>
	</form>
</template>
