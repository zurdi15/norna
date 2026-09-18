<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {Download} from '@lucide/vue'

import {dataExportFileName, useDownloadDataExportMutation, type DataExport} from '@/client/queries/dataExport'
import {getHumanSize} from '@/helpers/getHumanSize'
import UiButton from '@/ui/UiButton.vue'

import CurrentPasswordField from './CurrentPasswordField.vue'
import {usePasswordConfirmation} from './usePasswordConfirmation'

/** Saves the export as a zip; local accounts confirm with their password first. */
const props = defineProps<{
	dataExport: DataExport
}>()

const emit = defineEmits<{
	downloaded: []
}>()

const {t} = useI18n()
const {required, password, fieldError, field, take, fail, clear} = usePasswordConfirmation()
const download = useDownloadDataExportMutation()

async function submit() {
	const confirmed = take()
	if (confirmed === null || download.isPending.value) {
		return
	}
	try {
		await download.mutateAsync({password: confirmed, fileName: dataExportFileName(props.dataExport)})
		clear()
		emit('downloaded')
	} catch (cause) {
		fail(cause)
	} finally {
		// Drops the password from the mutation cache.
		download.reset()
	}
}
</script>

<template>
	<form
		class="grid gap-4"
		@submit.prevent="submit"
	>
		<CurrentPasswordField
			v-if="required"
			ref="field"
			v-model="password"
			:error="fieldError"
			data-autofocus
		/>
		<UiButton
			type="submit"
			variant="primary"
			:icon="Download"
			:loading="download.isPending.value"
			class="max-md:w-full md:justify-self-end"
		>
			{{ t('settingsData.download.submit') }}
			<span class="font-mono text-xs opacity-80">{{ getHumanSize(dataExport.size) }}</span>
		</UiButton>
	</form>
</template>
