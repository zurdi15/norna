<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {PackageOpen} from '@lucide/vue'

import {useDataExport} from '@/client/queries/dataExport'
import {useTitle} from '@/composables/useTitle'
import DataExportSummary from '@/features/settings/data/DataExportSummary.vue'
import ExportDownloadForm from '@/features/settings/data/ExportDownloadForm.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Where the "your export is ready" email leads: the export, and the download. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
useTitle(() => t('settingsData.download.title'))

const current = useDataExport()
const dataExport = computed(() => current.data.value ?? null)
</script>

<template>
	<PageHeader
		:title="t('settingsData.download.title')"
		:back="{name: 'user.settings.data-export'}"
	/>
	<div class="mx-auto grid w-full max-w-md gap-5 px-4 py-8 md:py-14">
		<div
			v-if="current.isPending.value"
			class="grid gap-4 rounded-lg border border-line bg-surface p-5"
			aria-hidden="true"
		>
			<div class="flex items-center gap-3">
				<UiSkeleton class="size-9" />
				<div class="grid flex-1 gap-1.5">
					<UiSkeleton class="h-4 w-48" />
					<UiSkeleton class="h-3 w-56" />
				</div>
			</div>
			<UiSkeleton class="h-9" />
		</div>
		<UiEmptyState
			v-else-if="!dataExport"
			:title="t('settingsData.download.noneTitle')"
			:description="t('settingsData.download.noneDescription')"
		>
			<template #actions>
				<UiButton
					:as="RouterLink"
					:to="{name: 'user.settings.data-export'}"
					variant="primary"
					:icon="PackageOpen"
				>
					{{ t('settingsData.download.requestNew') }}
				</UiButton>
			</template>
		</UiEmptyState>
		<template v-else>
			<section class="grid gap-5 rounded-lg border border-line bg-surface p-5">
				<DataExportSummary :data-export="dataExport" />
				<p class="text-sm text-pretty text-ink-muted">
					{{ t('settingsData.download.description') }}
				</p>
				<ExportDownloadForm :data-export="dataExport" />
			</section>
			<RouterLink
				:to="{name: 'user.settings.data-export'}"
				class="justify-self-center rounded-sm px-2 py-1 text-sm text-ink-muted hover:text-ink pointer-coarse:py-2.5"
			>
				{{ t('settingsData.download.requestNew') }}
			</RouterLink>
		</template>
	</div>
</template>
