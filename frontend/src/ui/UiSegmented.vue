<script setup lang="ts" generic="T extends string">
import type {Component, HTMLAttributes} from 'vue'
import {ToggleGroupItem, ToggleGroupRoot} from 'reka-ui'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'

export interface UiSegmentedItem<V extends string> {
	value: V
	label: string
	icon?: Component
	// Hide the text and keep it only as the accessible name.
	iconOnly?: boolean
}

const props = withDefaults(defineProps<{
	items: UiSegmentedItem<T>[]
	label: string
	size?: 'sm' | 'md'
	class?: HTMLAttributes['class']
}>(), {
	size: 'md',
	class: undefined,
})

const model = defineModel<T>({required: true})

// A segmented control always has one option selected; Reka would let a second click clear it.
function select(value: unknown) {
	if (typeof value === 'string' && value !== '') {
		model.value = value as T
	}
}
</script>

<template>
	<ToggleGroupRoot
		:model-value="model"
		type="single"
		:aria-label="label"
		:class="cn('inline-flex gap-0.5 rounded-md border border-line bg-canvas-subtle p-0.5', props.class)"
		@update:modelValue="select"
	>
		<ToggleGroupItem
			v-for="item in items"
			:key="item.value"
			:value="item.value"
			:aria-label="item.iconOnly ? item.label : undefined"
			:class="cn(
				'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 whitespace-nowrap text-ink-muted',
				'transition-colors duration-150 hover:text-ink',
				'data-[state=on]:bg-surface-raised data-[state=on]:text-ink data-[state=on]:shadow-raised',
				'data-[state=on]:ring-1 data-[state=on]:ring-line',
				size === 'sm' ? 'h-6 text-xs pointer-coarse:h-9' : 'h-7 text-sm pointer-coarse:h-10',
			)"
		>
			<UiIcon
				v-if="item.icon"
				:icon="item.icon"
				size="sm"
			/>
			<span v-if="!item.iconOnly">{{ item.label }}</span>
		</ToggleGroupItem>
	</ToggleGroupRoot>
</template>
