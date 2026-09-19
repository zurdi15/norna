<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from './cn'

const props = withDefaults(defineProps<{
	label?: string
	class?: HTMLAttributes['class']
}>(), {
	label: undefined,
	class: undefined,
})
</script>

<template>
	<svg
		viewBox="0 0 24 24"
		fill="none"
		:class="cn('size-4 shrink-0 animate-spin', props.class)"
		:role="label ? 'status' : undefined"
		:aria-label="label"
		:aria-hidden="label ? undefined : 'true'"
	>
		<circle
			cx="12"
			cy="12"
			r="9"
			stroke="currentColor"
			stroke-opacity="0.2"
			stroke-width="2.5"
		/>
		<path
			d="M21 12a9 9 0 0 0-9-9"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
		/>
	</svg>
</template>
