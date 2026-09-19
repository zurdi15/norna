<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import type {SavedFilterDraft} from '@/client/queries/savedFilters'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSwitch from '@/ui/UiSwitch.vue'
import UiTextarea from '@/ui/UiTextarea.vue'

import {useFilterConversion} from './filterData'
import FilterInput from './FilterInput.vue'
import {hidesDoneTasks, setShowDoneTasks} from './filterQuery'
import FilterSyntaxHelp from './FilterSyntaxHelp.vue'

/**
 * A saved filter: a name and the query that decides its tasks. The query is edited
 * with names (labels, projects) and stored with ids. The page owns the submit button.
 */
defineProps<{
	formId: string
}>()

const emit = defineEmits<{
	submit: []
}>()

const model = defineModel<SavedFilterDraft>({required: true})

const {t} = useI18n()
const {toApi, fromApi} = useFilterConversion()

const touched = ref(false)
const titleError = computed(() => touched.value && model.value.title.trim() === '' ? t('savedFilters.titleRequired') : undefined)

// The editor shows names; the model keeps the api's ids.
const query = ref('')
watch(() => model.value.filters.filter, filter => {
	if (toApi(query.value) !== filter) {
		query.value = fromApi(filter)
	}
}, {immediate: true})
watch(query, value => {
	model.value = {...model.value, filters: {...model.value.filters, filter: toApi(value)}}
})

const showDone = computed({
	get: () => !hidesDoneTasks(model.value.filters.filter),
	set: show => query.value = fromApi(setShowDoneTasks(model.value.filters.filter, show)),
})

const includeNulls = computed({
	get: () => model.value.filters.filter_include_nulls,
	set: value => model.value = {...model.value, filters: {...model.value.filters, filter_include_nulls: value}},
})

const filterInput = ref<InstanceType<typeof FilterInput> | null>(null)

function submit() {
	touched.value = true
	if (model.value.title.trim() !== '') {
		emit('submit')
	}
}
</script>

<template>
	<form
		:id="formId"
		class="grid gap-5"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('savedFilters.titleLabel')"
			:error="titleError"
			required
		>
			<UiInput
				v-model="model.title"
				data-autofocus
				autocomplete="off"
				@blur="touched = true"
			/>
		</UiField>
		<UiField :label="t('savedFilters.query')">
			<FilterInput
				ref="filterInput"
				v-model="query"
				:label="t('savedFilters.query')"
				@submit="submit"
			/>
		</UiField>
		<FilterSyntaxHelp @insert="token => filterInput?.insert(token)" />
		<label class="flex cursor-pointer items-center justify-between gap-4 text-base">
			{{ t('filters.showDone') }}
			<UiSwitch v-model="showDone" />
		</label>
		<label class="flex cursor-pointer items-start justify-between gap-4 text-base">
			<span class="grid gap-0.5">
				{{ t('filters.includeNulls') }}
				<span class="text-sm text-ink-faint">{{ t('filters.includeNullsHint') }}</span>
			</span>
			<UiSwitch v-model="includeNulls" />
		</label>
		<UiField :label="t('savedFilters.description')">
			<UiTextarea
				v-model="model.description"
				rows="2"
			/>
		</UiField>
	</form>
</template>
