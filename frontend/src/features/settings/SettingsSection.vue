<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {cn} from '@/ui/cn'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

/** A titled group of settings, its rows separated by hairlines. */
const props = withDefaults(defineProps<{
	title?: string
	description?: string
	tone?: 'default' | 'danger'
	class?: HTMLAttributes['class']
}>(), {
	title: undefined,
	description: undefined,
	tone: 'default',
	class: undefined,
})
</script>

<template>
	<section :class="cn('grid gap-1', props.class)">
		<div
			v-if="title || $slots.actions"
			class="flex items-end gap-3 pb-1"
		>
			<div class="min-w-0 flex-1">
				<UiSectionHeading
					v-if="title"
					:title="title"
					:tone="tone"
				/>
				<p
					v-if="description"
					class="mt-0.5 text-sm text-pretty text-ink-muted"
				>
					{{ description }}
				</p>
			</div>
			<slot name="actions" />
		</div>
		<div class="grid divide-y divide-line border-y border-line">
			<slot />
		</div>
	</section>
</template>
