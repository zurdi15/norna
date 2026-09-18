<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {cva} from 'class-variance-authority'
import {CircleAlert, CircleCheck, Info, TriangleAlert} from '@lucide/vue'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'

const props = withDefaults(defineProps<{
	tone?: 'info' | 'success' | 'warning' | 'danger'
	class?: HTMLAttributes['class']
}>(), {
	tone: 'info',
	class: undefined,
})

const alertVariants = cva('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm text-pretty', {
	variants: {
		tone: {
			info: 'border-accent-line bg-accent-subtle text-ink',
			success: 'border-success/35 bg-success-subtle text-ink',
			warning: 'border-warning/40 bg-warning-subtle text-ink',
			danger: 'border-danger/35 bg-danger-subtle text-ink',
		},
	},
})

const ICONS = {
	info: {icon: Info, class: 'text-accent'},
	success: {icon: CircleCheck, class: 'text-success'},
	warning: {icon: TriangleAlert, class: 'text-warning'},
	danger: {icon: CircleAlert, class: 'text-danger'},
} as const

const icon = computed(() => ICONS[props.tone])
</script>

<template>
	<!-- Errors interrupt (alert); the other tones are polite status updates. -->
	<div
		:role="tone === 'danger' ? 'alert' : 'status'"
		:class="cn(alertVariants({tone}), props.class)"
	>
		<UiIcon
			:icon="icon.icon"
			:class="cn('mt-0.5', icon.class)"
		/>
		<div class="min-w-0 flex-1">
			<slot />
		</div>
	</div>
</template>
