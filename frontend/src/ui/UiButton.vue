<script setup lang="ts">
import {computed, type Component, type HTMLAttributes} from 'vue'
import {Primitive} from 'reka-ui'

import {cn} from './cn'
import {buttonVariants, type ButtonSize, type ButtonVariant} from './button'
import UiIcon from './UiIcon.vue'
import UiKbd from './UiKbd.vue'
import UiSpinner from './UiSpinner.vue'

const props = withDefaults(defineProps<{
	variant?: ButtonVariant
	size?: ButtonSize
	block?: boolean
	// 'button', 'a', or a component such as RouterLink (pass `to` as an attribute)
	as?: string | Component
	type?: 'button' | 'submit' | 'reset'
	disabled?: boolean
	// Busy but still focusable: blocks clicks without dropping focus to <body>.
	loading?: boolean
	icon?: Component
	iconEnd?: Component
	// Keyboard hint shown on pointer devices, e.g. "Mod+Enter".
	shortcut?: string
	// Also make the shortcut press this button (see directives/shortcut).
	bindShortcut?: boolean
	// Icon buttons show the shortcut in their tooltip instead.
	showShortcut?: boolean
	class?: HTMLAttributes['class']
}>(), {
	variant: 'secondary',
	size: 'md',
	block: false,
	as: 'button',
	type: 'button',
	disabled: false,
	loading: false,
	icon: undefined,
	iconEnd: undefined,
	shortcut: undefined,
	bindShortcut: false,
	showShortcut: true,
	class: undefined,
})

const isNativeButton = computed(() => props.as === 'button')
// Native `disabled` only for a real <button> that is genuinely unavailable; links and busy
// buttons use aria-disabled so they keep focus.
const ariaDisabled = computed(() => props.loading || (props.disabled && !isNativeButton.value))
const iconSize = computed(() => props.size === 'lg' ? 'lg' : 'md')

function onClickCapture(event: MouseEvent) {
	if (ariaDisabled.value) {
		// Capture listeners run first at the target, so this also stops the parent's @click.
		event.preventDefault()
		event.stopImmediatePropagation()
	}
}
</script>

<template>
	<Primitive
		v-shortcut="bindShortcut && shortcut ? shortcut : ''"
		:as="as"
		:type="isNativeButton ? type : undefined"
		:disabled="isNativeButton ? disabled : undefined"
		:aria-disabled="ariaDisabled ? 'true' : undefined"
		:aria-busy="loading ? 'true' : undefined"
		:class="cn(buttonVariants({variant, size, block}), props.class)"
		@click.capture="onClickCapture"
	>
		<UiSpinner v-if="loading" />
		<UiIcon
			v-else-if="icon"
			:icon="icon"
			:size="iconSize"
		/>
		<slot />
		<UiIcon
			v-if="iconEnd"
			:icon="iconEnd"
			:size="iconSize"
		/>
		<UiKbd
			v-if="shortcut && showShortcut"
			:shortcut="shortcut"
			class="ms-1 hidden pointer-fine:inline-flex"
		/>
	</Primitive>
</template>
