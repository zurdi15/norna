<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {CheckboxIndicator, CheckboxRoot} from 'reka-ui'
import {Check, Minus} from '@lucide/vue'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'

const props = withDefaults(defineProps<{
	disabled?: boolean
	class?: HTMLAttributes['class']
}>(), {
	disabled: false,
	class: undefined,
})

const model = defineModel<boolean | 'indeterminate'>({default: false})
const indicator = computed(() => model.value === 'indeterminate' ? Minus : Check)
</script>

<template>
	<label
		:class="cn(
			'inline-flex items-center gap-2.5 text-base',
			disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
			props.class,
		)"
	>
		<CheckboxRoot
			v-model="model"
			:disabled="disabled"
			class="
				grid size-4.5 shrink-0 place-items-center rounded-sm border-[1.5px] border-line-strong bg-surface
				text-on-accent transition-colors duration-150
				hover:border-accent
				data-[state=checked]:border-accent data-[state=checked]:bg-accent
				data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent
				pointer-coarse:size-5
			"
		>
			<CheckboxIndicator>
				<UiIcon
					:icon="indicator"
					:stroke="3.25"
					size="xs"
				/>
			</CheckboxIndicator>
		</CheckboxRoot>
		<span
			v-if="$slots.default"
			class="min-w-0"
		><slot /></span>
	</label>
</template>
