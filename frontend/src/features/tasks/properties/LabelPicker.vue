<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import type {Label} from '@/client/generated'
import {sortLabelsAlphabetically, useCreateLabelMutation} from '@/client/queries/labels'
import {useAddTaskLabelMutation, useRemoveTaskLabelMutation} from '@/client/queries/taskLabels'
import {useLabels} from '@/composables/useLabels'
import {getRandomColorHex} from '@/helpers/color/randomColor'
import {useAuthStore} from '@/stores/auth'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiListbox from '@/ui/UiListbox.vue'

type LabelWithId = Label & {id: number}

/** Toggles labels on a task; typing a new name creates the label (not from a link share). */
const props = defineProps<{
	taskId: number
	selected: readonly Label[]
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const {labels} = useLabels()
const addLabel = useAddTaskLabelMutation()
const removeLabel = useRemoveTaskLabelMutation()
const createLabel = useCreateLabelMutation()

const query = ref('')

// Toggled right away; the task refetch confirms it or brings back the truth after a failure.
const selectedIds = ref<number[]>([])
watch(() => props.selected, current => {
	selectedIds.value = current.map(label => label.id).filter((id): id is number => id !== undefined)
}, {immediate: true})

const items = computed(() => sortLabelsAlphabetically(labels.value)
	.filter((label): label is LabelWithId => label.id !== undefined))

function toggle(id: number) {
	const label = items.value.find(candidate => candidate.id === id)
	if (!label) {
		return
	}
	if (selectedIds.value.includes(id)) {
		selectedIds.value = selectedIds.value.filter(selectedId => selectedId !== id)
		removeLabel.mutate({taskId: props.taskId, label})
	} else {
		selectedIds.value = [...selectedIds.value, id]
		addLabel.mutate({taskId: props.taskId, label})
	}
}

async function create(title: string) {
	const created = await createLabel.mutateAsync({title, hex_color: getRandomColorHex()})
	if (created.id !== undefined) {
		query.value = ''
		selectedIds.value = [...selectedIds.value, created.id]
		addLabel.mutate({taskId: props.taskId, label: created as LabelWithId})
	}
}
</script>

<template>
	<UiListbox
		v-model:query="query"
		:model-value="selectedIds"
		:items="items"
		:item-key="label => label.id"
		:item-label="label => label.title ?? ''"
		:label="t('taskDetail.properties.labels')"
		:search-placeholder="t('taskDetail.searchLabels')"
		:creatable="!authStore.authLinkShare"
		multiple
		class="md:w-72"
		@select="toggle"
		@create="create"
	>
		<template #item="{item}">
			<UiColorDot :color="item.hex_color" />
			<span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
		</template>
	</UiListbox>
</template>
