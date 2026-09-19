<script setup lang="ts">
import {TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger} from 'reka-ui'

import {useBreakpoints} from './composables/useBreakpoints'
import UiKbd from './UiKbd.vue'

withDefaults(defineProps<{
	content?: string
	shortcut?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	disabled?: boolean
}>(), {
	content: undefined,
	shortcut: undefined,
	side: 'top',
	disabled: false,
})

// Touch screens have no hover: a tooltip there would only appear after a tap and hide the target.
const {hasFinePointer} = useBreakpoints()
</script>

<template>
	<TooltipRoot v-if="hasFinePointer && !disabled && content">
		<TooltipTrigger as-child>
			<slot />
		</TooltipTrigger>
		<TooltipPortal>
			<TooltipContent
				:side="side"
				:side-offset="6"
				class="
					z-(--z-tooltip) flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-xs text-canvas
					shadow-overlay
					data-[state=closed]:animate-fade-out
					data-[state=delayed-open]:animate-fade-in
					data-[state=instant-open]:animate-fade-in
				"
			>
				{{ content }}
				<UiKbd
					v-if="shortcut"
					:shortcut="shortcut"
				/>
			</TooltipContent>
		</TooltipPortal>
	</TooltipRoot>
	<slot v-else />
</template>
