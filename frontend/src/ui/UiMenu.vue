<script setup lang="ts">
import {DropdownMenuContent, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger} from 'reka-ui'

import {cn} from './cn'
import {useBreakpoints} from './composables/useBreakpoints'
import {menuPanelClass, type UiMenuEntry} from './menu'
import UiDialog from './UiDialog.vue'
import UiMenuItems from './UiMenuItems.vue'

/** A dropdown menu from md up; an action sheet with large touch rows below. */
withDefaults(defineProps<{
	items: UiMenuEntry[]
	// Sheet heading on touch screens.
	title: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	align?: 'start' | 'center' | 'end'
	// Off when an item opens something else (a picker) that must keep the focus.
	restoreFocus?: boolean
}>(), {
	side: 'bottom',
	align: 'end',
	restoreFocus: true,
})

const open = defineModel<boolean>('open', {default: false})
const {isMd} = useBreakpoints()
</script>

<template>
	<DropdownMenuRoot
		v-if="isMd"
		v-model:open="open"
	>
		<DropdownMenuTrigger as-child>
			<slot name="trigger" />
		</DropdownMenuTrigger>
		<DropdownMenuPortal>
			<DropdownMenuContent
				:side="side"
				:align="align"
				:side-offset="6"
				:collision-padding="8"
				:class="cn(menuPanelClass, 'origin-(--reka-dropdown-menu-content-transform-origin)')"
				@closeAutoFocus="(event: Event) => !restoreFocus && event.preventDefault()"
			>
				<UiMenuItems
					kind="dropdown"
					:items="items"
				/>
			</DropdownMenuContent>
		</DropdownMenuPortal>
	</DropdownMenuRoot>
	<UiDialog
		v-else
		v-model:open="open"
		:title="title"
		presentation="sheet"
		body-class="px-0 pb-2"
	>
		<template #trigger>
			<slot name="trigger" />
		</template>
		<UiMenuItems
			kind="sheet"
			:items="items"
			@select="open = false"
		/>
	</UiDialog>
</template>
