<script setup lang="ts">
import {computed, ref, useAttrs, type HTMLAttributes} from 'vue'

import {cn} from './cn'
import {fieldBoxVariants, useFieldContext} from './field'

const props = withDefaults(defineProps<{
	size?: 'sm' | 'md'
	invalid?: boolean
	// Classes for the outer box; other attributes (type, placeholder…) go to the <input>.
	class?: HTMLAttributes['class']
}>(), {
	size: 'md',
	invalid: false,
	class: undefined,
})

defineOptions({inheritAttrs: false})

const model = defineModel<string | number | null>({default: ''})

const attrs = useAttrs()
const field = useFieldContext()
const input = ref<HTMLInputElement | null>(null)

const isInvalid = computed(() => props.invalid || field?.invalid.value === true)

defineExpose({
	focus: () => input.value?.focus(),
	select: () => input.value?.select(),
	input,
})
</script>

<template>
	<div :class="cn(fieldBoxVariants({size, invalid: isInvalid}), props.class)">
		<span
			v-if="$slots.leading"
			class="flex shrink-0 text-ink-faint"
		>
			<slot name="leading" />
		</span>
		<input
			v-bind="attrs"
			:id="(attrs.id as string | undefined) ?? field?.id"
			ref="input"
			v-model="model"
			:aria-describedby="(attrs['aria-describedby'] as string | undefined) ?? field?.describedBy.value"
			:aria-invalid="isInvalid ? 'true' : undefined"
			class="h-full min-w-0 flex-1 bg-transparent placeholder:text-ink-faint focus-visible:outline-none"
		>
		<slot name="trailing" />
	</div>
</template>
