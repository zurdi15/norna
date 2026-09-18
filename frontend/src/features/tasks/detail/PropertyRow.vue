<script setup lang="ts">
import {useId, type Component, type HTMLAttributes} from 'vue'

import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiIcon from '@/ui/UiIcon.vue'

/**
 * One property of a task, Notion style: icon and name on the left, the value on the
 * right. The value is a button that opens the property's picker in place.
 */
withDefaults(defineProps<{
	icon: Component
	label: string
	editable?: boolean
	// Width of the picker from md up; phones always get the full-width sheet.
	popoverClass?: HTMLAttributes['class']
}>(), {
	editable: true,
	popoverClass: undefined,
})

const open = defineModel<boolean>('open', {default: false})
const labelId = useId()
const valueId = useId()
</script>

<template>
	<div
		class="
			grid min-h-9 grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-2
			sm:grid-cols-[7.75rem_minmax(0,1fr)]
			pointer-coarse:min-h-11
		"
	>
		<span
			:id="labelId"
			class="flex min-w-0 items-center gap-2 text-sm text-ink-faint"
		>
			<UiIcon
				:icon="icon"
				size="sm"
			/>
			<span class="truncate">{{ label }}</span>
		</span>
		<UiAdaptivePopover
			v-if="editable"
			v-model:open="open"
			:title="label"
			:class="popoverClass"
		>
			<template #trigger>
				<button
					type="button"
					:aria-labelledby="`${labelId} ${valueId}`"
					class="
						-mx-2 flex min-h-8 min-w-0 cursor-pointer items-center rounded-md px-2 text-start text-base
						transition-colors
						hover:bg-canvas-subtle
						focus-visible:outline-2 focus-visible:outline-accent
						data-[state=open]:bg-canvas-subtle
						pointer-coarse:min-h-10 pointer-coarse:text-md
					"
				>
					<span
						:id="valueId"
						class="flex min-w-0 flex-wrap items-center gap-1.5"
					>
						<slot name="value" />
					</span>
				</button>
			</template>
			<template #default="{close}">
				<slot
					name="picker"
					:close="close"
				/>
			</template>
		</UiAdaptivePopover>
		<span
			v-else
			:id="valueId"
			class="flex min-w-0 flex-wrap items-center gap-1.5 text-base pointer-coarse:text-md"
		>
			<slot name="value" />
		</span>
	</div>
</template>
