<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {ProgressIndicator, ProgressRoot} from 'reka-ui'

import {cn} from './cn'

const props = withDefaults(defineProps<{
	value: number
	max?: number
	label?: string
	class?: HTMLAttributes['class']
}>(), {
	max: 100,
	label: undefined,
	class: undefined,
})

const percent = computed(() => props.max > 0 ? Math.min(100, Math.max(0, props.value / props.max * 100)) : 0)
</script>

<template>
	<ProgressRoot
		:model-value="value"
		:max="max"
		:aria-label="label"
		:class="cn('h-0.75 w-full overflow-hidden rounded-full bg-line', props.class)"
	>
		<ProgressIndicator
			class="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
			:style="{width: `${percent}%`}"
		/>
	</ProgressRoot>
</template>
