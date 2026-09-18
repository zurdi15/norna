<script setup lang="ts">
import type {HTMLAttributes} from 'vue'
import {DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden} from 'reka-ui'

import {cn} from './cn'

// A panel sliding in from the start edge, for navigation on screens without room for a sidebar.
const props = withDefaults(defineProps<{
	// Names the drawer for assistive tech; the content carries its own visible heading.
	title: string
	class?: HTMLAttributes['class']
}>(), {
	class: undefined,
})

const open = defineModel<boolean>('open', {default: false})
const NO_DESCRIPTION = {'aria-describedby': undefined}
</script>

<template>
	<DialogRoot v-model:open="open">
		<DialogPortal>
			<DialogOverlay
				class="
					fixed inset-0 z-(--z-overlay) bg-scrim
					data-[state=closed]:animate-fade-out
					data-[state=open]:animate-fade-in
				"
			/>
			<DialogContent
				v-bind="NO_DESCRIPTION"
				:class="cn(
					'fixed inset-y-0 inset-s-0 z-(--z-modal) flex w-[min(20rem,85vw)] flex-col border-e border-line bg-canvas-subtle',
					'pt-safe pb-safe shadow-overlay focus:outline-none',
					'data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in',
					props.class,
				)"
			>
				<VisuallyHidden>
					<DialogTitle>{{ title }}</DialogTitle>
				</VisuallyHidden>
				<slot />
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
