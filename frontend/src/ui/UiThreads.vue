<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from './cn'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<!-- Three threads, one per Norn, crossing once where they are woven together. -->
	<svg
		viewBox="0 0 120 56"
		fill="none"
		:class="cn('h-14 w-30 text-line-strong', props.class)"
		aria-hidden="true"
	>
		<path
			d="M2 14 C 30 14, 42 42, 60 28 S 90 14, 118 42"
			stroke="currentColor"
			stroke-width="1.25"
		/>
		<path
			d="M2 42 C 30 42, 42 14, 60 28 S 90 42, 118 14"
			stroke="currentColor"
			stroke-width="1.25"
		/>
		<path
			d="M2 28 C 34 28, 44 28, 60 28 S 88 28, 118 28"
			class="text-accent"
			stroke="currentColor"
			stroke-width="1.5"
		/>
		<rect
			x="57"
			y="25"
			width="6"
			height="6"
			rx="1"
			class="fill-accent"
			transform="rotate(45 60 28)"
		/>
	</svg>
</template>
