<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQueryClient} from '@tanstack/vue-query'
import {ArrowLeft, ArrowRight, Import} from '@lucide/vue'

import {
	hasTitleColumn,
	migrationPhase,
	useCsvPreview,
	useDetectCsvMutation,
	useMigrationStatus,
	useStartCsvImportMutation,
	watchMigration,
	type CsvImportConfig,
} from '@/client/queries/migration'
import {readCsvHead, remapColumns} from '@/features/migration/csv'
import CsvColumns from '@/features/migration/CsvColumns.vue'
import CsvPreviewList from '@/features/migration/CsvPreviewList.vue'
import ImportFilePicker from '@/features/migration/ImportFilePicker.vue'
import ImportStatusPanel from '@/features/migration/ImportStatusPanel.vue'
import ImportSteps from '@/features/migration/ImportSteps.vue'
import {MIGRATORS} from '@/features/migration/migrators'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {getErrorText} from '@/message'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

/**
 * A CSV file into tasks, one step per screen: the file, what each column holds, and a
 * preview of the result before importing. The server reads the file anew at each step.
 */
defineOptions({inheritAttrs: false})

type Step = 'file' | 'columns' | 'preview'

const CSV = MIGRATORS.csv

const {t} = useI18n()
const queryClient = useQueryClient()

const status = useMigrationStatus('csv')
const phase = computed(() => migrationPhase(status.data.value))
// Once an import is seen running in this visit its end is news; an older one's is history.
const following = ref(false)
watch(phase, current => {
	if (current === 'running') {
		following.value = true
		watchMigration(queryClient, 'csv')
	}
}, {immediate: true})

const step = ref<Step>('file')
const steps = computed(() => (['file', 'columns', 'preview'] as const).map(key => ({key, label: t(`migration.csv.steps.${key}`)})))
const heading = useTemplateRef<HTMLElement>('heading')

async function goTo(next: Step) {
	step.value = next
	error.value = ''
	// The button that was pressed is gone: the new step's heading takes the focus.
	await nextTick()
	heading.value?.focus()
}

const file = ref<File | null>(null)
const detectedFile = ref<File | null>(null)
const config = ref<CsvImportConfig | null>(null)
// The server's guess, for columns that come back after trying another separator.
let suggested: CsvImportConfig['mapping'] = []
const rows = ref<string[][]>([])
const error = ref('')

const detect = useDetectCsvMutation()
watch(file, async picked => {
	if (!picked || picked === detectedFile.value) {
		return
	}
	error.value = ''
	try {
		const detection = await detect.mutateAsync(picked)
		if (file.value !== picked) {
			return
		}
		detectedFile.value = picked
		config.value = detection.config
		suggested = detection.config.mapping
		rows.value = detection.rows
		await goTo('columns')
	} catch (cause) {
		if (file.value === picked) {
			error.value = getErrorText(cause)
		}
	} finally {
		detect.reset()
	}
})

// The server only detects columns with its own guess of the separator.
const rereading = ref(false)
async function changeDelimiter(delimiter: string) {
	const picked = file.value
	if (!picked || !config.value) {
		return
	}
	rereading.value = true
	try {
		const head = await readCsvHead(picked, delimiter, config.value.quote_char)
		if (file.value === picked && config.value) {
			config.value = {...config.value, delimiter, mapping: remapColumns(head.columns, [...config.value.mapping, ...suggested])}
			rows.value = head.rows
		}
	} catch (cause) {
		error.value = getErrorText(cause)
	} finally {
		rereading.value = false
	}
}

const hasTitle = computed(() => config.value !== null && hasTitleColumn(config.value))
const preview = useCsvPreview(
	() => step.value === 'preview' ? file.value : null,
	() => step.value === 'preview' ? config.value : null,
)
const previewError = computed(() => preview.error.value ? getErrorText(preview.error.value) : '')
const total = computed(() => preview.data.value?.total_rows ?? 0)
const previewReady = computed(() => preview.data.value !== undefined && !preview.isPlaceholderData.value)

const importer = useStartCsvImportMutation()
async function runImport() {
	if (!file.value || !config.value || importer.isPending.value) {
		return
	}
	error.value = ''
	try {
		await importer.mutateAsync({file: file.value, config: config.value})
		following.value = true
	} catch (cause) {
		error.value = getErrorText(cause)
	} finally {
		// Drops the file from the mutation cache.
		importer.reset()
	}
}

function startOver() {
	following.value = false
	file.value = null
	detectedFile.value = null
	config.value = null
	rows.value = []
	suggested = []
	void goTo('file')
}
</script>

<template>
	<SettingsPage
		:title="t('migration.csv.title')"
		:description="t('migration.csv.description')"
		:back="{name: 'migrate.start'}"
	>
		<div
			v-if="status.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-5 w-48" />
			<UiSkeleton class="h-36 rounded-lg" />
		</div>
		<ImportStatusPanel
			v-else-if="following && phase !== 'idle' && status.data.value"
			:migrator="CSV"
			:status="status.data.value"
			@again="startOver"
		/>
		<div
			v-else
			class="grid gap-6"
		>
			<ImportSteps
				:steps="steps"
				:current="step"
			/>
			<h3
				ref="heading"
				tabindex="-1"
				class="sr-only"
			>
				{{ t('migration.csv.stepOf', {current: steps.findIndex(item => item.key === step) + 1, total: steps.length}) }}:
				{{ t(`migration.csv.steps.${step}`) }}
			</h3>

			<template v-if="step === 'file'">
				<p class="text-base text-pretty">
					{{ t('migration.csv.file.description') }}
				</p>
				<ImportFilePicker
					v-model="file"
					:accept="CSV.accept"
					:busy="detect.isPending.value"
					:busy-label="t('migration.csv.file.reading')"
				/>
				<UiAlert
					v-if="error"
					tone="danger"
				>
					{{ error }}
				</UiAlert>
				<div
					v-if="detectedFile && detectedFile === file"
					class="flex md:justify-end"
				>
					<UiButton
						variant="primary"
						:icon-end="ArrowRight"
						class="max-md:w-full"
						@click="goTo('columns')"
					>
						{{ t('migration.csv.next') }}
					</UiButton>
				</div>
			</template>

			<template v-else-if="step === 'columns' && config">
				<CsvColumns
					v-model="config"
					:rows="rows"
					:busy="rereading"
					@delimiter="changeDelimiter"
				/>
				<UiAlert
					v-if="error"
					tone="danger"
				>
					{{ error }}
				</UiAlert>
				<div class="flex gap-2 md:justify-between">
					<UiButton
						variant="ghost"
						:icon="ArrowLeft"
						class="max-md:flex-1"
						@click="goTo('file')"
					>
						{{ t('migration.csv.back') }}
					</UiButton>
					<UiButton
						variant="primary"
						:icon-end="ArrowRight"
						:disabled="!hasTitle || rereading"
						class="max-md:flex-1"
						@click="goTo('preview')"
					>
						{{ t('migration.csv.toPreview') }}
					</UiButton>
				</div>
			</template>

			<template v-else-if="step === 'preview'">
				<div class="grid gap-1">
					<p class="text-base text-pretty">
						{{ t('migration.csv.preview.description') }}
					</p>
					<p
						v-if="previewReady"
						class="flex items-center gap-2 text-sm text-ink-muted"
					>
						{{ t('migration.csv.preview.count', total) }}
					</p>
				</div>
				<UiAlert
					v-if="previewError"
					tone="danger"
				>
					{{ previewError }}
				</UiAlert>
				<div
					v-else-if="!preview.data.value"
					class="grid gap-2"
					aria-hidden="true"
				>
					<UiSkeleton class="h-14 rounded-lg" />
					<UiSkeleton class="h-14 rounded-lg" />
					<UiSkeleton class="h-14 rounded-lg" />
				</div>
				<div
					v-else
					class="relative"
				>
					<CsvPreviewList
						:preview="preview.data.value"
						:class="!previewReady && 'opacity-60'"
					/>
					<UiSpinner
						v-if="!previewReady"
						class="absolute top-3 right-3 text-accent"
						:label="t('migration.csv.preview.loading')"
					/>
					<p
						v-if="previewReady && total === 0"
						class="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted"
					>
						{{ t('migration.csv.preview.none') }}
					</p>
				</div>
				<UiAlert
					v-if="error"
					tone="danger"
				>
					{{ error }}
				</UiAlert>
				<div class="flex gap-2 md:justify-between">
					<UiButton
						variant="ghost"
						:icon="ArrowLeft"
						class="max-md:flex-1"
						@click="goTo('columns')"
					>
						{{ t('migration.csv.back') }}
					</UiButton>
					<UiButton
						variant="primary"
						:icon="Import"
						:disabled="!previewReady || total === 0"
						:loading="importer.isPending.value"
						class="max-md:flex-1"
						@click="runImport"
					>
						{{ previewReady ? t('migration.csv.import', total) : t('migration.csv.importPending') }}
					</UiButton>
				</div>
			</template>
		</div>
	</SettingsPage>
</template>
