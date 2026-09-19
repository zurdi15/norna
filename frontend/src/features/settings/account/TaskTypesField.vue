<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'

import {sortLabelsAlphabetically} from '@/client/queries/labels'
import {useLabels} from '@/composables/useLabels'
import UiChip from '@/ui/UiChip.vue'

/** Which labels are task types: one toggle per label, in the order they get marked. */
defineProps<{
	label: string
}>()

const model = defineModel<readonly number[]>({default: () => []})

const {t} = useI18n()
const {labels, isPending} = useLabels()
const sorted = computed(() => sortLabelsAlphabetically(labels.value))

const isType = (id: number) => model.value.includes(id)

function toggle(id: number) {
	model.value = isType(id)
		? model.value.filter(other => other !== id)
		: [...model.value, id]
}
</script>

<template>
	<p
		v-if="!isPending && !sorted.length"
		class="text-sm text-pretty text-ink-muted"
	>
		{{ t('settingsAccount.general.taskTypesEmpty') }}
		<RouterLink
			:to="{name: 'labels.index'}"
			class="text-accent hover:underline"
		>
			{{ t('settingsAccount.general.taskTypesLabels') }}
		</RouterLink>
	</p>
	<div
		v-else
		role="group"
		:aria-label="label"
		class="flex flex-wrap gap-1.5"
	>
		<UiChip
			v-for="type in sorted"
			:key="type.id"
			as="button"
			:color="type.hex_color"
			:pressed="isType(type.id ?? 0)"
			class="pointer-coarse:h-11 pointer-coarse:px-3"
			@click="toggle(type.id ?? 0)"
		>
			{{ type.title }}
		</UiChip>
	</div>
</template>
