<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import UiListbox from '@/ui/UiListbox.vue'
import UiProgress from '@/ui/UiProgress.vue'

const emit = defineEmits<{
	select: [percent: number]
}>()

// 0–1, as the api stores it.
const percentDone = defineModel<number>({default: 0})

const {t} = useI18n()

const STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const items = STEPS.map(step => ({id: step, title: `${step} %`}))

const selected = computed(() => Math.round(percentDone.value * 10) * 10)

function pick(step: number) {
	percentDone.value = step / 100
	emit('select', step / 100)
}
</script>

<template>
	<UiListbox
		:model-value="selected"
		:items="items"
		:item-key="item => item.id"
		:item-label="item => item.title"
		:label="t('taskDetail.properties.progress')"
		:searchable="false"
		class="min-w-52"
		@select="pick"
	>
		<template #item="{item}">
			<UiProgress
				:value="item.id"
				class="w-16"
			/>
			<span class="min-w-0 flex-1 font-mono text-xs tabular-nums">{{ item.title }}</span>
		</template>
	</UiListbox>
</template>
