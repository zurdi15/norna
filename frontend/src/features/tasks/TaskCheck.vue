<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {Check} from '@lucide/vue'

import {PRIORITIES} from '@/constants/priorities'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

const props = withDefaults(defineProps<{
	// Names the checkbox, e.g. "Complete “Pay the rent”".
	label: string
	priority?: number
	size?: 'sm' | 'md' | 'lg'
	disabled?: boolean
	class?: HTMLAttributes['class']
}>(), {
	priority: 0,
	size: 'md',
	disabled: false,
	class: undefined,
})

const done = defineModel<boolean>({default: false})

const SIZES = {
	sm: 'size-4',
	md: 'size-4.5 pointer-coarse:size-5.5',
	lg: 'size-5.5',
} as const

// Urgent tasks carry their weight on the check itself, before the title is even read.
const tone = computed(() => {
	if (props.priority >= PRIORITIES.DO_NOW) {
		return 'border-danger bg-danger-subtle'
	}
	if (props.priority >= PRIORITIES.URGENT) {
		return 'border-warning'
	}
	return 'border-line-strong bg-surface'
})
</script>

<template>
	<!-- The ::before box widens the hit area to a thumb without growing the visible check. -->
	<button
		type="button"
		role="checkbox"
		:aria-checked="done"
		:aria-label="label"
		:disabled="disabled"
		:class="cn(
			'relative grid shrink-0 cursor-pointer place-items-center rounded-sm border-[1.5px] text-transparent',
			'transition-[background-color,border-color,color] duration-150',
			'before:absolute before:-inset-2 pointer-coarse:before:-inset-3',
			'hover:border-accent disabled:cursor-not-allowed disabled:opacity-60',
			SIZES[size],
			done ? 'border-accent bg-accent text-on-accent' : tone,
			props.class,
		)"
		@click.stop="done = !done"
	>
		<UiIcon
			:icon="Check"
			:stroke="3.25"
			:size="size === 'lg' ? 'sm' : 'xs'"
			:class="done && 'animate-pop-in'"
		/>
	</button>
</template>
