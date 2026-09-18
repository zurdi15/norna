<script setup lang="ts">
import {computed} from 'vue'
import {
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from 'reka-ui'

import {cn} from './cn'
import type {UiMenuAction, UiMenuEntry} from './menu'
import {Check} from '@lucide/vue'

import UiIcon from './UiIcon.vue'
import UiKbd from './UiKbd.vue'

const props = defineProps<{
	items: UiMenuEntry[]
	// dropdown and context render Reka menu items; sheet renders a touch list of buttons.
	kind: 'dropdown' | 'context' | 'sheet'
}>()

const emit = defineEmits<{
	// Sheet only: the parent closes the sheet after an action runs.
	select: []
}>()

const parts = computed(() => props.kind === 'context'
	? {item: ContextMenuItem, label: ContextMenuLabel, separator: ContextMenuSeparator}
	: {item: DropdownMenuItem, label: DropdownMenuLabel, separator: DropdownMenuSeparator})

function isAction(entry: UiMenuEntry): entry is UiMenuAction {
	return entry.type === undefined || entry.type === 'item'
}

function runFromSheet(action: UiMenuAction) {
	emit('select')
	action.onSelect()
}
</script>

<template>
	<template v-if="kind === 'sheet'">
		<template
			v-for="(entry, i) in items"
			:key="i"
		>
			<div
				v-if="entry.type === 'separator'"
				class="my-1 h-px bg-line"
				role="separator"
			/>
			<p
				v-else-if="entry.type === 'label'"
				class="px-5 pt-3 pb-1 caption"
			>
				{{ entry.label }}
			</p>
			<button
				v-else-if="isAction(entry)"
				type="button"
				:disabled="entry.disabled"
				:class="cn(
					'flex h-12 w-full cursor-pointer items-center gap-3.5 px-5 text-start text-md',
					'active:bg-canvas-subtle disabled:opacity-50',
					entry.tone === 'danger' ? 'text-danger' : 'text-ink',
				)"
				@click="runFromSheet(entry)"
			>
				<UiIcon
					v-if="entry.icon"
					:icon="entry.icon"
					size="lg"
					:class="entry.tone === 'danger' ? undefined : 'text-ink-muted'"
				/>
				<span class="flex-1">{{ entry.label }}</span>
				<UiIcon
					v-if="entry.checked"
					:icon="Check"
					size="lg"
					class="text-accent"
				/>
			</button>
		</template>
	</template>
	<template v-else>
		<template
			v-for="(entry, i) in items"
			:key="i"
		>
			<component
				:is="parts.separator"
				v-if="entry.type === 'separator'"
				class="-mx-1 my-1 h-px bg-line"
			/>
			<component
				:is="parts.label"
				v-else-if="entry.type === 'label'"
				class="px-2 pt-2 pb-1 caption"
			>
				{{ entry.label }}
			</component>
			<component
				:is="parts.item"
				v-else-if="isAction(entry)"
				:disabled="entry.disabled"
				:class="cn(
					'flex h-8 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-base outline-none select-none',
					'data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-canvas-subtle',
					entry.tone === 'danger' ? 'text-danger' : 'text-ink',
				)"
				@select="entry.onSelect"
			>
				<UiIcon
					v-if="entry.icon"
					:icon="entry.icon"
					:class="entry.tone === 'danger' ? undefined : 'text-ink-faint'"
				/>
				<span class="flex-1 truncate">{{ entry.label }}</span>
				<UiIcon
					v-if="entry.checked"
					:icon="Check"
					class="text-accent"
				/>
				<UiKbd
					v-if="entry.shortcut"
					:shortcut="entry.shortcut"
				/>
			</component>
		</template>
	</template>
</template>
