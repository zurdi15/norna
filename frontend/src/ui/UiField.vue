<script setup lang="ts">
import {computed, useId, type HTMLAttributes} from 'vue'

import {cn} from './cn'
import {provideField} from './field'

const props = withDefaults(defineProps<{
	label: string
	hint?: string
	// Replaces the hint while set.
	error?: string
	required?: boolean
	// The label stays for screen readers; use when the context already names the field.
	hideLabel?: boolean
	class?: HTMLAttributes['class']
}>(), {
	hint: undefined,
	error: undefined,
	required: false,
	hideLabel: false,
	class: undefined,
})

const id = useId()
const messageId = `${id}-message`

provideField({
	id,
	describedBy: computed(() => (props.error || props.hint) ? messageId : undefined),
	invalid: computed(() => Boolean(props.error)),
})
</script>

<template>
	<div :class="cn('grid content-start gap-1.5', props.class)">
		<label
			:for="id"
			:class="cn('text-sm font-medium text-ink', hideLabel && 'sr-only')"
		>
			{{ label }}<span
				v-if="required"
				class="text-ink-faint"
				aria-hidden="true"
			> *</span>
		</label>
		<slot :id="id" />
		<p
			v-if="error"
			:id="messageId"
			class="text-xs text-danger"
		>
			{{ error }}
		</p>
		<p
			v-else-if="hint"
			:id="messageId"
			class="text-xs text-ink-faint"
		>
			{{ hint }}
		</p>
	</div>
</template>
