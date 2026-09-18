<script setup lang="ts">
import type {Component, HTMLAttributes} from 'vue'

import {cn} from './cn'

export type UiIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(defineProps<{
	icon: Component
	size?: UiIconSize
	// Only for icons that carry meaning on their own; decorative icons stay hidden from assistive tech.
	label?: string
	// In viewBox units; the default is the hairline stroke, glyphs like a checkmark go heavier.
	stroke?: number
	class?: HTMLAttributes['class']
}>(), {
	size: 'md',
	label: undefined,
	stroke: 1.75,
	class: undefined,
})

const SIZES: Record<UiIconSize, string> = {
	xs: 'size-3',
	sm: 'size-3.5',
	md: 'size-4',
	lg: 'size-5',
	xl: 'size-5.5',
}
</script>

<template>
	<!-- 1.75 in the 24-unit viewBox renders as a hairline at 16px: the thread look. -->
	<component
		:is="icon"
		:class="cn(SIZES[size], 'shrink-0', props.class)"
		:stroke-width="stroke"
		:aria-hidden="label ? undefined : 'true'"
		:aria-label="label"
		:role="label ? 'img' : undefined"
	/>
</template>
