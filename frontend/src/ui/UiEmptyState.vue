<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from './cn'
import UiThreads from './UiThreads.vue'

const props = withDefaults(defineProps<{
	title: string
	description?: string
	class?: HTMLAttributes['class']
}>(), {
	description: undefined,
	class: undefined,
})
</script>

<template>
	<div :class="cn('flex flex-col items-center px-6 py-12 text-center', props.class)">
		<slot name="illustration">
			<UiThreads />
		</slot>
		<p class="mt-5 text-base font-semibold text-balance">
			{{ title }}
		</p>
		<p
			v-if="description"
			class="mt-1.5 max-w-sm text-sm text-pretty text-ink-muted"
		>
			{{ description }}
		</p>
		<div
			v-if="$slots.actions"
			class="mt-5 flex flex-wrap justify-center gap-2"
		>
			<slot name="actions" />
		</div>
	</div>
</template>
