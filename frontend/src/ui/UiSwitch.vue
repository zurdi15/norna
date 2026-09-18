<script setup lang="ts">
import type {HTMLAttributes} from 'vue'
import {SwitchRoot, SwitchThumb} from 'reka-ui'

import {cn} from './cn'
import {useFieldContext} from './field'

const props = withDefaults(defineProps<{
	disabled?: boolean
	class?: HTMLAttributes['class']
}>(), {
	disabled: false,
	class: undefined,
})

const model = defineModel<boolean>({default: false})
const field = useFieldContext()
</script>

<template>
	<SwitchRoot
		:id="field?.id"
		v-model="model"
		:aria-describedby="field?.describedBy.value"
		:disabled="disabled"
		:class="cn(
			'relative inline-flex h-5 w-8.5 shrink-0 cursor-pointer items-center rounded-full bg-line-strong p-0.5',
			'transition-colors duration-150 data-[state=checked]:bg-accent',
			'disabled:cursor-not-allowed disabled:opacity-60 pointer-coarse:h-6 pointer-coarse:w-10',
			props.class,
		)"
	>
		<SwitchThumb
			class="
				block size-4 rounded-full bg-surface-raised shadow-raised transition-transform duration-150 ease-out
				data-[state=checked]:translate-x-3.5
				pointer-coarse:size-5
				pointer-coarse:data-[state=checked]:translate-x-4
			"
		/>
	</SwitchRoot>
</template>
