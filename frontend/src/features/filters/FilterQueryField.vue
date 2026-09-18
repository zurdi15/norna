<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useFilterConversion} from './filterData'
import FilterInput from './FilterInput.vue'
import {hidesDoneTasks, setShowDoneTasks} from './filterQuery'
import UiSwitch from '@/ui/UiSwitch.vue'

/**
 * A filter query edited with names but stored with ids (the api format), plus the
 * "show done tasks" switch most filters want. For views and bucket rules.
 */
withDefaults(defineProps<{
	label: string
	projectId?: number
	showDoneSwitch?: boolean
}>(), {
	projectId: undefined,
	showDoneSwitch: true,
})

// In the api's format.
const filter = defineModel<string>({required: true})

const {t} = useI18n()
const {toApi, fromApi} = useFilterConversion()

const query = ref('')
watch(filter, value => {
	if (toApi(query.value) !== value) {
		query.value = fromApi(value)
	}
}, {immediate: true})
watch(query, value => {
	filter.value = toApi(value)
})

const showDone = computed({
	get: () => !hidesDoneTasks(filter.value),
	set: show => filter.value = setShowDoneTasks(filter.value, show),
})
</script>

<template>
	<div class="grid gap-3">
		<FilterInput
			v-model="query"
			:label="label"
			:project-id="projectId"
		/>
		<label
			v-if="showDoneSwitch"
			class="flex cursor-pointer items-center justify-between gap-4 text-sm"
		>
			{{ t('filters.showDone') }}
			<UiSwitch v-model="showDone" />
		</label>
	</div>
</template>
