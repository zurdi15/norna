<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {hasTitleColumn, type CsvAttribute, type CsvImportConfig} from '@/client/queries/migration'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import UiAlert from '@/ui/UiAlert.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSelect from '@/ui/UiSelect.vue'

import {
	columnExample,
	CSV_ATTRIBUTE_KEYS,
	CSV_ATTRIBUTES,
	CSV_DELIMITERS,
	dateFormatOptions,
} from './csv'

/**
 * What each column of the file holds, and how to read the file. The server guessed
 * both; a different separator splits the columns anew, so the page re-reads them.
 */
const props = defineProps<{
	// A few rows of the file, for an example next to each column.
	rows: string[][]
	// Re-reading the columns after the separator changed.
	busy?: boolean
}>()

const emit = defineEmits<{
	delimiter: [value: string]
}>()

const config = defineModel<CsvImportConfig>({required: true})

const {t} = useI18n()

const attributeItems = computed(() => CSV_ATTRIBUTES.map(value => ({value, label: t(`migration.csv.attributes.${CSV_ATTRIBUTE_KEYS[value]}`)})))
const delimiterItems = computed(() => CSV_DELIMITERS.map(({value, key}) => ({value, label: t(`migration.csv.delimiters.${key}`)})))
const dateFormatItems = computed(() => dateFormatOptions(config.value.date_format))
const titleMissing = computed(() => !hasTitleColumn(config.value))

function update(patch: Partial<CsvImportConfig>) {
	config.value = {...config.value, ...patch}
}

function setAttribute(index: number, attribute: CsvAttribute | undefined) {
	if (attribute) {
		update({mapping: config.value.mapping.map((mapping, i) => i === index ? {...mapping, attribute} : mapping)})
	}
}

function setDateFormat(value: string | undefined) {
	if (value) {
		update({date_format: value})
	}
}

function setDelimiter(value: string | undefined) {
	if (value && value !== config.value.delimiter) {
		emit('delimiter', value)
	}
}

const skipRows = computed({
	get: () => config.value.skip_rows,
	set: value => {
		const rows = Math.trunc(Number(value))
		update({skip_rows: Number.isFinite(rows) && rows > 0 ? rows : 0})
	},
})

function example(index: number): string {
	const value = columnExample(props.rows, index)
	return value === '' ? t('migration.csv.columns.noExample') : t('migration.csv.columns.example', {value})
}
</script>

<template>
	<div class="grid gap-8">
		<div class="grid gap-3">
			<SettingsSection
				:title="t('migration.csv.columns.title')"
				:description="t('migration.csv.columns.description')"
			>
				<SettingsRow
					v-for="(mapping, index) in config.mapping"
					:key="mapping.column_index"
					:label="mapping.column_name || t('migration.csv.columns.unnamed', {number: mapping.column_index + 1})"
					:description="example(index)"
					stack
				>
					<UiSelect
						:items="attributeItems"
						:model-value="mapping.attribute"
						@update:modelValue="attribute => setAttribute(index, attribute)"
					/>
				</SettingsRow>
			</SettingsSection>
			<UiAlert
				v-if="titleMissing"
				tone="warning"
			>
				{{ t('migration.csv.columns.titleRequired') }}
			</UiAlert>
		</div>
		<SettingsSection
			:title="t('migration.csv.format.title')"
			:aria-busy="busy || undefined"
		>
			<SettingsRow
				:label="t('migration.csv.format.delimiter')"
				stack
			>
				<UiSelect
					:items="delimiterItems"
					:model-value="config.delimiter"
					:disabled="busy"
					@update:modelValue="setDelimiter"
				/>
			</SettingsRow>
			<SettingsRow
				:label="t('migration.csv.format.dateFormat')"
				:description="t('migration.csv.format.dateFormatDescription')"
				stack
			>
				<UiSelect
					:items="dateFormatItems"
					:model-value="config.date_format"
					class="font-mono"
					@update:modelValue="setDateFormat"
				/>
			</SettingsRow>
			<SettingsRow
				v-slot="{id, describedBy}"
				:label="t('migration.csv.format.skipRows')"
				:description="t('migration.csv.format.skipRowsDescription')"
			>
				<UiInput
					:id="id"
					v-model="skipRows"
					:aria-describedby="describedBy"
					type="number"
					inputmode="numeric"
					min="0"
					class="w-20 font-mono tabular-nums"
				/>
			</SettingsRow>
		</SettingsSection>
	</div>
</template>
