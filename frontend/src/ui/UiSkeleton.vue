<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from './cn'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<div
		:class="cn('h-4 animate-pulse rounded-md bg-canvas-subtle', props.class)"
		aria-hidden="true"
	/>
</template>
