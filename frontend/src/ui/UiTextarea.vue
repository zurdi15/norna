<script setup lang="ts">
import {computed, useAttrs, type HTMLAttributes} from 'vue'
import {useTextareaAutosize} from '@vueuse/core'

import {cn} from './cn'
import {useFieldContext} from './field'

const props = withDefaults(defineProps<{
	invalid?: boolean
	class?: HTMLAttributes['class']
}>(), {
	invalid: false,
	class: undefined,
})

defineOptions({inheritAttrs: false})

const model = defineModel<string>({default: ''})

const attrs = useAttrs()
const field = useFieldContext()
const isInvalid = computed(() => props.invalid || field?.invalid.value === true)

// Grows with its content, so there is no resize handle.
const {textarea} = useTextareaAutosize({input: model})
</script>

<template>
	<textarea
		v-bind="attrs"
		:id="(attrs.id as string | undefined) ?? field?.id"
		ref="textarea"
		v-model="model"
		:aria-describedby="(attrs['aria-describedby'] as string | undefined) ?? field?.describedBy.value"
		:aria-invalid="isInvalid ? 'true' : undefined"
		:class="cn(
			'block min-h-20 w-full resize-none rounded-md border bg-surface px-2.5 py-2 text-base text-ink',
			`
				transition-[border-color,box-shadow] duration-150
				placeholder:text-ink-faint
				focus-visible:ring-3 focus-visible:outline-none
			`,
			'pointer-coarse:text-lg',
			isInvalid
				? 'border-danger focus-visible:ring-danger/20'
				: 'border-line-strong focus-visible:border-accent focus-visible:ring-accent/20',
			props.class,
		)"
	/>
</template>
