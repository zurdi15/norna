<script setup lang="ts">
import {ref, watch} from 'vue'

import UiInput from '@/ui/UiInput.vue'

/**
 * A text field for a setting that saves on its own: edits stay local until Enter or
 * leaving the field, and Escape puts the saved value back. Other attributes go to the input.
 */
const props = defineProps<{
	value: string
}>()

const emit = defineEmits<{
	commit: [value: string]
}>()

defineOptions({inheritAttrs: false})

const draft = ref('')
// A save elsewhere (or a revert after a failed one) shows up unless the user is typing.
const editing = ref(false)
watch(() => props.value, value => {
	if (!editing.value) {
		draft.value = value
	}
}, {immediate: true})

function commit() {
	editing.value = false
	const value = draft.value.trim()
	if (value !== props.value) {
		emit('commit', value)
	}
	draft.value = value
}

function cancel(event: KeyboardEvent) {
	draft.value = props.value
	editing.value = false
	const input = event.target as HTMLInputElement
	input.blur()
}
</script>

<template>
	<UiInput
		v-bind="$attrs"
		v-model="draft"
		@input="editing = true"
		@blur="commit"
		@keydown.enter.prevent="commit"
		@keydown.esc="cancel"
	/>
</template>
