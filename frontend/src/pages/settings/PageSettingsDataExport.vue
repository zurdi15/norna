<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {Download, PackageOpen} from '@lucide/vue'

import {
	dataExportFileName,
	isDataExportPending,
	useDataExport,
	useDownloadDataExportMutation,
	useRequestDataExportMutation,
	type DataExportRequest,
} from '@/client/queries/dataExport'
import CurrentPasswordField from '@/features/settings/data/CurrentPasswordField.vue'
import DataExportSummary from '@/features/settings/data/DataExportSummary.vue'
import ExportDownloadForm from '@/features/settings/data/ExportDownloadForm.vue'
import {usePasswordConfirmation} from '@/features/settings/data/usePasswordConfirmation'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {error as showError, success} from '@/message'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

/**
 * A copy of everything in the account, as a zip another Norna or Vikunja can import.
 * The server builds it in the background: the page waits for it and an email follows.
 */
defineOptions({inheritAttrs: false})

const {t} = useI18n()

const request = ref<DataExportRequest | null>(null)
const current = useDataExport(request)
const dataExport = computed(() => current.data.value ?? null)
const pending = computed(() => isDataExportPending(current.data.value, request.value))

watch(pending, (now, before) => {
	if (before && !now) {
		success({message: t('settingsData.export.ready')})
	}
})

const {required, password, fieldError, field, take, fail, clear} = usePasswordConfirmation()
const requestExport = useRequestDataExportMutation()

async function submitRequest() {
	const confirmed = take()
	if (confirmed === null || requestExport.isPending.value) {
		return
	}
	const previousId = dataExport.value?.id ?? null
	try {
		await requestExport.mutateAsync(confirmed)
		clear()
		request.value = {previousId, at: Date.now()}
	} catch (cause) {
		fail(cause)
	} finally {
		// Drops the password from the mutation cache.
		requestExport.reset()
	}
}

// Accounts without a password download right away; the rest confirm it in a dialog.
const downloadOpen = ref(false)
const directDownload = useDownloadDataExportMutation()

async function download() {
	if (!dataExport.value) {
		return
	}
	if (required.value) {
		downloadOpen.value = true
		return
	}
	try {
		await directDownload.mutateAsync({password: '', fileName: dataExportFileName(dataExport.value)})
	} catch (cause) {
		showError(cause)
	} finally {
		directDownload.reset()
	}
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.export')"
		:description="t('settingsData.export.description')"
	>
		<SettingsSection :title="t('settingsData.export.currentTitle')">
			<div
				v-if="current.isPending.value"
				class="flex items-center gap-3 py-3"
				aria-hidden="true"
			>
				<UiSkeleton class="size-9" />
				<div class="grid flex-1 gap-1.5">
					<UiSkeleton class="h-4 w-48" />
					<UiSkeleton class="h-3 w-64" />
				</div>
			</div>
			<div
				v-else-if="pending"
				class="flex items-center gap-3 py-3"
				role="status"
			>
				<span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas-subtle text-accent">
					<UiSpinner />
				</span>
				<div class="grid min-w-0 gap-0.5">
					<p class="text-base font-medium">
						{{ t('settingsData.export.preparing') }}
					</p>
					<p class="text-sm text-pretty text-ink-muted">
						{{ t('settingsData.export.preparingDescription') }}
					</p>
				</div>
			</div>
			<div
				v-else-if="dataExport"
				class="flex flex-wrap items-center gap-x-4 gap-y-3 py-3"
			>
				<DataExportSummary :data-export="dataExport" />
				<UiButton
					:icon="Download"
					:loading="directDownload.isPending.value"
					class="max-md:w-full"
					@click="download"
				>
					{{ t('settingsData.download.submit') }}
				</UiButton>
			</div>
			<div
				v-else
				class="flex items-center gap-3 py-3 text-sm text-ink-muted"
			>
				<span
					class="grid size-9 shrink-0 place-items-center rounded-md border border-dashed border-line-strong text-ink-faint"
				>
					<UiIcon :icon="PackageOpen" />
				</span>
				{{ t('settingsData.export.none') }}
			</div>
		</SettingsSection>

		<SettingsSection
			:title="t('settingsData.export.newTitle')"
			:description="dataExport ? t('settingsData.export.replaces') : undefined"
		>
			<form
				class="grid gap-4 py-4"
				@submit.prevent="submitRequest"
			>
				<p class="text-sm text-pretty text-ink-muted">
					{{ t('settingsData.export.newDescription') }}
				</p>
				<CurrentPasswordField
					v-if="required"
					ref="field"
					v-model="password"
					:error="fieldError"
					class="md:max-w-sm"
				/>
				<UiButton
					type="submit"
					variant="primary"
					:icon="PackageOpen"
					:loading="requestExport.isPending.value"
					:disabled="pending"
					class="max-md:w-full md:justify-self-start"
				>
					{{ t('settingsData.export.request') }}
				</UiButton>
			</form>
		</SettingsSection>

		<UiDialog
			v-model:open="downloadOpen"
			:title="t('settingsData.download.title')"
			:description="t('settingsData.download.dialogDescription')"
			size="sm"
		>
			<ExportDownloadForm
				v-if="dataExport"
				:data-export="dataExport"
				@downloaded="downloadOpen = false"
			/>
		</UiDialog>
	</SettingsPage>
</template>
