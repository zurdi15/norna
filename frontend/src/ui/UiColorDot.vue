<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'

import {cn} from './cn'
import {toCssHex} from '@/helpers/color/toCssHex'

const props = withDefaults(defineProps<{
	// API color, with or without '#'. Without one the dot falls back to a neutral token.
	color?: string | null
	class?: HTMLAttributes['class']
}>(), {
	color: undefined,
	class: undefined,
})

const background = computed(() => toCssHex(props.color))
</script>

<template>
	<!-- The inset ring keeps near-white or near-black user colors visible on either theme. -->
	<span
		:class="cn('inline-block size-2 shrink-0 rounded-full bg-line-strong ring-1 ring-ink/10 ring-inset', props.class)"
		:style="background ? {backgroundColor: background} : undefined"
		aria-hidden="true"
	/>
</template>
