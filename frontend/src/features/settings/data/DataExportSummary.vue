<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {FileArchive} from '@lucide/vue'

import {dataExportFileName, type DataExport} from '@/client/queries/dataExport'
import {getHumanSize} from '@/helpers/getHumanSize'
import {formatDate, formatDateLong, formatDateShort} from '@/helpers/time/formatDate'
import UiIcon from '@/ui/UiIcon.vue'

/** The export ready to download: when it was made, its size and until when it stays. */
defineProps<{
	dataExport: DataExport
}>()

const {t} = useI18n()
</script>

<template>
	<div class="flex min-w-0 flex-1 items-center gap-3">
		<span
			class="grid size-9 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent"
			aria-hidden="true"
		>
			<UiIcon
				:icon="FileArchive"
				size="lg"
			/>
		</span>
		<div class="grid min-w-0 flex-1 gap-0.5">
			<p class="truncate font-mono text-sm text-ink">
				{{ dataExportFileName(dataExport) }}
			</p>
			<p class="flex flex-wrap items-center gap-x-1.5 font-mono text-2xs text-ink-faint">
				<time
					:datetime="dataExport.created.toISOString()"
					:title="formatDateLong(dataExport.created)"
				>{{ formatDateShort(dataExport.created) }}</time>
				<span aria-hidden="true">·</span>
				<span>{{ getHumanSize(dataExport.size) }}</span>
				<span aria-hidden="true">·</span>
				<span>
					{{ t('settingsData.export.until') }}
					<time :datetime="dataExport.expires.toISOString()">{{ formatDate(dataExport.expires, 'll') }}</time>
				</span>
			</p>
		</div>
	</div>
</template>
