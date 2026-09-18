<script setup lang="ts">
import type {HTMLAttributes} from 'vue'
import {cn} from '@/ui/cn'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<!-- The rune ᚾ (Naudiz, N): a stave crossed by one carved diagonal. Decorative next to the wordmark. -->
	<span
		:class="cn('inline-grid size-6 shrink-0 place-items-center rounded-md bg-accent text-on-accent', props.class)"
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 24 24"
			class="size-7/10"
			fill="none"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="square"
		>
			<path d="M12 3.5v17M7.5 8.5l9 6.5" />
		</svg>
	</span>
</template>
