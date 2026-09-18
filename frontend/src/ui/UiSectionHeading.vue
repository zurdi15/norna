<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from './cn'

const props = withDefaults(defineProps<{
	title: string
	// Mono label above the title, e.g. the Norn's name over a time block.
	caption?: string
	count?: number | string
	as?: 'h2' | 'h3' | 'h4'
	tone?: 'default' | 'danger' | 'faint'
	class?: HTMLAttributes['class']
}>(), {
	caption: undefined,
	count: undefined,
	as: 'h2',
	tone: 'default',
	class: undefined,
})

const TONES = {
	default: 'text-ink',
	danger: 'text-danger',
	faint: 'text-ink-faint',
} as const
</script>

<template>
	<div :class="cn('min-w-0', props.class)">
		<p
			v-if="caption"
			class="mb-1 caption"
		>
			{{ caption }}
		</p>
		<div class="flex min-h-6 items-center gap-2">
			<component
				:is="as"
				:class="cn('text-sm font-semibold', TONES[tone])"
			>
				{{ title }}
			</component>
			<span
				v-if="count !== undefined"
				class="font-mono text-2xs text-ink-faint tabular-nums"
			>{{ count }}</span>
			<span
				class="thread"
				aria-hidden="true"
			/>
			<slot name="actions" />
		</div>
	</div>
</template>
