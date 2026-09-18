<script setup lang="ts">
import type {Component, HTMLAttributes} from 'vue'

import {cn} from './cn'
import {iconButtonSizes, type ButtonSize, type ButtonVariant} from './button'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import UiTooltip from './UiTooltip.vue'

const props = withDefaults(defineProps<{
	icon: Component
	// Required: it is the accessible name and the tooltip.
	label: string
	variant?: ButtonVariant
	size?: ButtonSize
	as?: string | Component
	type?: 'button' | 'submit' | 'reset'
	disabled?: boolean
	loading?: boolean
	shortcut?: string
	tooltip?: boolean
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
	class?: HTMLAttributes['class']
}>(), {
	variant: 'ghost',
	size: 'md',
	as: 'button',
	type: 'button',
	disabled: false,
	loading: false,
	shortcut: undefined,
	tooltip: true,
	tooltipSide: 'top',
	class: undefined,
})

// The root is the tooltip wrapper (a fragment), so attributes and listeners from a parent,
// such as a menu trigger using as-child, must be forwarded to the button explicitly.
defineOptions({inheritAttrs: false})

</script>

<template>
	<UiTooltip
		:content="label"
		:shortcut="shortcut"
		:side="tooltipSide"
		:disabled="!tooltip"
	>
		<UiButton
			v-bind="$attrs"
			:as="as"
			:type="type"
			:variant="variant"
			:size="size"
			:disabled="disabled"
			:loading="loading"
			:aria-label="label"
			:class="cn(iconButtonSizes[size], props.class)"
		>
			<UiIcon
				v-if="!loading"
				:icon="icon"
				:size="size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'"
			/>
		</UiButton>
	</UiTooltip>
</template>
