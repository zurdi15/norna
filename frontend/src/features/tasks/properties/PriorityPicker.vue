<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import UiListbox from '@/ui/UiListbox.vue'

import PriorityMark from '../PriorityMark.vue'
import {PRIORITY_LEVELS, priorityLabelKey} from '../priority'

const emit = defineEmits<{
	select: [priority: number]
}>()

const priority = defineModel<number>({default: 0})

const {t} = useI18n()

function pick(level: number) {
	priority.value = level
	emit('select', level)
}

const items = computed(() => PRIORITY_LEVELS.map(level => ({id: level, title: t(priorityLabelKey(level))})))
</script>

<template>
	<UiListbox
		:model-value="priority"
		:items="items"
		:item-key="item => item.id"
		:item-label="item => item.title"
		:label="t('taskDetail.properties.priority')"
		:searchable="false"
		class="min-w-52"
		@select="pick"
	>
		<template #item="{item}">
			<span class="grid w-4 place-items-center">
				<PriorityMark
					:priority="item.id"
					decorative
				/>
			</span>
			<span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
		</template>
	</UiListbox>
</template>
