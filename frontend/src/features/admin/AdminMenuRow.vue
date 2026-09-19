<script setup lang="ts">
import {Ellipsis} from '@lucide/vue'

import type {UiMenuEntry} from '@/ui/menu'
import UiIcon from '@/ui/UiIcon.vue'
import UiMenu from '@/ui/UiMenu.vue'

/** A row of an admin list that opens its actions: a menu on wide screens, an action sheet on phones. */
defineProps<{
	items: UiMenuEntry[]
	// Heads the action sheet.
	title: string
}>()

// The menu root renders no element: attributes go to the row itself.
defineOptions({inheritAttrs: false})
</script>

<template>
	<UiMenu
		:items="items"
		:title="title"
	>
		<template #trigger>
			<button
				v-bind="$attrs"
				type="button"
				class="
					flex min-h-13 w-full cursor-pointer items-center gap-3 px-4 py-2 text-start transition-colors
					hover:bg-canvas-subtle
					focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent
					data-[state=open]:bg-canvas-subtle
					@2xl:px-6
					pointer-coarse:min-h-15
				"
			>
				<slot />
				<UiIcon
					:icon="Ellipsis"
					class="shrink-0 text-ink-faint"
				/>
			</button>
		</template>
	</UiMenu>
</template>
