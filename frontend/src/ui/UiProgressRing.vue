<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'

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

const RADIUS = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const fraction = computed(() => props.max > 0 ? Math.min(1, Math.max(0, props.value / props.max)) : 0)
</script>

<template>
	<svg
		viewBox="0 0 24 24"
		:class="cn('size-4 shrink-0 -rotate-90', props.class)"
		role="progressbar"
		:aria-valuenow="value"
		:aria-valuemin="0"
		:aria-valuemax="max"
		:aria-label="label"
	>
		<circle
			cx="12"
			cy="12"
			:r="RADIUS"
			fill="none"
			class="stroke-line"
			stroke-width="3"
		/>
		<circle
			cx="12"
			cy="12"
			:r="RADIUS"
			fill="none"
			class="stroke-accent transition-[stroke-dashoffset] duration-300 ease-out"
			stroke-width="3"
			stroke-linecap="round"
			:stroke-dasharray="CIRCUMFERENCE"
			:stroke-dashoffset="CIRCUMFERENCE * (1 - fraction)"
		/>
	</svg>
</template>
