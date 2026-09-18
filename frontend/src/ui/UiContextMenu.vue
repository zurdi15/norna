<script setup lang="ts">
import {ref} from 'vue'
import {ContextMenuContent, ContextMenuPortal, ContextMenuRoot, ContextMenuTrigger} from 'reka-ui'
import {onLongPress} from '@vueuse/core'

import {cn} from './cn'
import {useBreakpoints} from './composables/useBreakpoints'
import {menuPanelClass, type UiMenuEntry} from './menu'
import UiDialog from './UiDialog.vue'
import UiMenuItems from './UiMenuItems.vue'

/**
 * Right-click menu on pointer screens; on touch screens a long press opens the same
 * actions as an action sheet. The wrapped element should be `select-none touch-callout-none`
 * so the long press isn't taken over by text selection or the native callout.
 */
const props = withDefaults(defineProps<{
	items: UiMenuEntry[]
	title: string
	disabled?: boolean
}>(), {
	disabled: false,
})

const {hasFinePointer} = useBreakpoints()
const sheetOpen = ref(false)
const target = ref<HTMLElement | null>(null)

onLongPress(target, () => {
	if (props.disabled) {
		return
	}
	navigator.vibrate?.(8)
	sheetOpen.value = true
}, {delay: 450, distanceThreshold: 8})

defineExpose({
	open: () => sheetOpen.value = true,
})
</script>

<template>
	<ContextMenuRoot v-if="hasFinePointer && !disabled">
		<ContextMenuTrigger as-child>
			<slot />
		</ContextMenuTrigger>
		<ContextMenuPortal>
			<ContextMenuContent
				:collision-padding="8"
				:class="cn(menuPanelClass, 'origin-(--reka-context-menu-content-transform-origin)')"
			>
				<UiMenuItems
					kind="context"
					:items="items"
				/>
			</ContextMenuContent>
		</ContextMenuPortal>
	</ContextMenuRoot>
	<div
		v-else
		ref="target"
		class="contents"
		@contextmenu.prevent
	>
		<slot />
		<UiDialog
			v-model:open="sheetOpen"
			:title="title"
			presentation="sheet"
			body-class="px-0 pb-2"
		>
			<UiMenuItems
				kind="sheet"
				:items="items"
				@select="sheetOpen = false"
			/>
		</UiDialog>
	</div>
</template>
