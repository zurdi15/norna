<script setup lang="ts" generic="T extends string | number">
import {computed, type Component, type HTMLAttributes} from 'vue'
import {
	SelectContent,
	SelectItem,
	SelectItemIndicator,
	SelectItemText,
	SelectPortal,
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectViewport,
} from 'reka-ui'
import {Check, ChevronsUpDown} from '@lucide/vue'

import {cn} from './cn'
import {fieldBoxVariants, useFieldContext} from './field'
import UiIcon from './UiIcon.vue'

export interface UiSelectItem<V> {
	value: V
	label: string
	icon?: Component
	disabled?: boolean
}

const props = withDefaults(defineProps<{
	items: UiSelectItem<T>[]
	placeholder?: string
	size?: 'sm' | 'md'
	disabled?: boolean
	class?: HTMLAttributes['class']
}>(), {
	placeholder: undefined,
	size: 'md',
	disabled: false,
	class: undefined,
})

const model = defineModel<T | undefined>({default: undefined})
const field = useFieldContext()
const selected = computed(() => props.items.find(item => item.value === model.value))
</script>

<template>
	<SelectRoot
		v-model="model"
		:disabled="disabled"
	>
		<SelectTrigger
			:id="field?.id"
			:aria-describedby="field?.describedBy.value"
			:aria-invalid="field?.invalid.value ? 'true' : undefined"
			:class="cn(
				fieldBoxVariants({size, invalid: field?.invalid.value === true}),
				'cursor-pointer justify-between text-start focus-visible:border-accent focus-visible:outline-none',
				'focus-visible:ring-3 focus-visible:ring-accent/20',
				props.class,
			)"
		>
			<span class="flex min-w-0 items-center gap-2">
				<UiIcon
					v-if="selected?.icon"
					:icon="selected.icon"
					class="text-ink-muted"
				/>
				<SelectValue
					:placeholder="placeholder"
					class="truncate data-placeholder:text-ink-faint"
				/>
			</span>
			<UiIcon
				:icon="ChevronsUpDown"
				size="sm"
				class="text-ink-faint"
			/>
		</SelectTrigger>
		<SelectPortal>
			<SelectContent
				position="popper"
				:side-offset="4"
				class="
					z-(--z-overlay) max-h-(--reka-select-content-available-height) min-w-(--reka-select-trigger-width)
					overflow-hidden rounded-lg border border-line bg-surface-raised p-1 shadow-overlay
					data-[state=closed]:animate-pop-out
					data-[state=open]:animate-pop-in
				"
			>
				<SelectViewport>
					<SelectItem
						v-for="item in items"
						:key="String(item.value)"
						:value="item.value"
						:disabled="item.disabled"
						class="
							flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-base outline-none
							select-none
							data-disabled:opacity-50
							data-highlighted:bg-canvas-subtle
							pointer-coarse:h-11 pointer-coarse:text-md
						"
					>
						<UiIcon
							v-if="item.icon"
							:icon="item.icon"
							class="text-ink-muted"
						/>
						<SelectItemText>{{ item.label }}</SelectItemText>
						<SelectItemIndicator class="ms-auto text-accent">
							<UiIcon :icon="Check" />
						</SelectItemIndicator>
					</SelectItem>
				</SelectViewport>
			</SelectContent>
		</SelectPortal>
	</SelectRoot>
</template>
