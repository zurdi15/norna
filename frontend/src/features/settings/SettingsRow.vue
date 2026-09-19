<script setup lang="ts">
import {computed, useId} from 'vue'

import {provideField} from '@/ui/field'

/**
 * One setting: its name and what it does on the left, the control on the right;
 * stacked on narrow screens when `stack` is set (wide controls like selects).
 * Kit controls (UiSelect, UiInput, UiTextarea, UiSwitch) pick the ids up by themselves, as
 * inside a UiField; others get them from the slot: `<Picker :id="id" :aria-describedby="describedBy" />`.
 */
const props = withDefaults(defineProps<{
	label: string
	description?: string
	// Wide controls (selects, inputs) go below the label on phones.
	stack?: boolean
}>(), {
	description: undefined,
	stack: false,
})

const id = useId()
const descriptionId = `${id}-description`
const describedBy = computed(() => props.description ? descriptionId : undefined)

provideField({id, describedBy, invalid: computed(() => false)})
</script>

<template>
	<div
		class="flex gap-x-6 gap-y-2 py-3"
		:class="[
			stack ? 'flex-col md:flex-row md:items-center' : 'items-center',
		]"
	>
		<div class="min-w-0 flex-1">
			<label
				:for="id"
				class="block text-base text-ink pointer-coarse:text-md"
			>{{ label }}</label>
			<p
				v-if="description"
				:id="descriptionId"
				class="mt-0.5 text-sm text-pretty text-ink-muted"
			>
				{{ description }}
			</p>
		</div>
		<div
			class="shrink-0"
			:class="[stack && 'md:w-64']"
		>
			<slot
				:id="id"
				:described-by="describedBy"
			/>
		</div>
	</div>
</template>
