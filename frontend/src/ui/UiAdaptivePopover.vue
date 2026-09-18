<script setup lang="ts">
import type {HTMLAttributes} from 'vue'

import {useBreakpoints} from './composables/useBreakpoints'
import UiDialog from './UiDialog.vue'
import UiPopover from './UiPopover.vue'

/**
 * The picker overlay: an anchored popover from md up, a bottom sheet below.
 * Pickers render their content once in the default slot and it works in both.
 */
withDefaults(defineProps<{
	// Sheet heading on touch screens, popover name for assistive tech on pointer screens.
	title: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	align?: 'start' | 'center' | 'end'
	class?: HTMLAttributes['class']
}>(), {
	side: 'bottom',
	align: 'start',
	class: undefined,
})

const open = defineModel<boolean>('open', {default: false})
const {isMd} = useBreakpoints()
</script>

<template>
	<UiPopover
		v-if="isMd"
		v-model:open="open"
		:label="title"
		:side="side"
		:align="align"
		:class="$props.class"
	>
		<template
			v-if="$slots.trigger"
			#trigger
		>
			<slot name="trigger" />
		</template>
		<template #default="{close}">
			<slot :close="close" />
		</template>
	</UiPopover>
	<UiDialog
		v-else
		v-model:open="open"
		:title="title"
		presentation="sheet"
		body-class="px-0 pb-2"
	>
		<template
			v-if="$slots.trigger"
			#trigger
		>
			<slot name="trigger" />
		</template>
		<template #default="{close}">
			<slot :close="close" />
		</template>
	</UiDialog>
</template>
