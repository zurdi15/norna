<script setup lang="ts">
import type {HTMLAttributes} from 'vue'
import {PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger} from 'reka-ui'

import {cn} from './cn'

const props = withDefaults(defineProps<{
	// Names the popover for assistive tech; pickers pass their title.
	label?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	align?: 'start' | 'center' | 'end'
	class?: HTMLAttributes['class']
}>(), {
	label: undefined,
	side: 'bottom',
	align: 'start',
	class: undefined,
})

const open = defineModel<boolean>('open', {default: false})

function close() {
	open.value = false
}
</script>

<template>
	<PopoverRoot v-model:open="open">
		<PopoverTrigger
			v-if="$slots.trigger"
			as-child
		>
			<slot name="trigger" />
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent
				:side="side"
				:align="align"
				:side-offset="6"
				:collision-padding="8"
				:aria-label="label"
				:class="cn(
					'z-(--z-popover) max-h-(--reka-popover-content-available-height) w-72 overflow-y-auto',
					'origin-(--reka-popover-content-transform-origin) rounded-lg border border-line bg-surface-raised shadow-overlay',
					'focus:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
					props.class,
				)"
			>
				<slot :close="close" />
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>
