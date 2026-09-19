<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useTimeFormat} from '@/composables/useTimeFormat'
import {TIME_FORMAT} from '@/constants/timeFormat'
import {formatTimeOfDay, isSameTimeOfDay, parseTimeOfDay, stepTimeOfDay, type TimeOfDay} from '@/helpers/time/timeOfDay'
import UiInput from '@/ui/UiInput.vue'

/**
 * A time of day typed as text ("9", "930", "14:30", "2pm"): it only becomes the value on
 * Enter or blur, so "1" on the way to "14:30" doesn't jump. Arrows step 15 minutes (an hour with Shift).
 */
defineOptions({inheritAttrs: false})

const model = defineModel<TimeOfDay | null>({default: null})

const {locale} = useI18n()
const {store: timeFormat} = useTimeFormat()

const format = computed(() => ({locale: locale.value, hour12: timeFormat.value === TIME_FORMAT.HOURS_12}))
const display = (time: TimeOfDay | null) => time ? formatTimeOfDay(time, format.value) : ''

const draft = ref('')
const editing = ref(false)
watch([model, format], () => {
	if (!editing.value) {
		draft.value = display(model.value)
	}
}, {immediate: true})

function commit() {
	editing.value = false
	const parsed = parseTimeOfDay(draft.value)
	if (parsed && !isSameTimeOfDay(parsed, model.value)) {
		model.value = parsed
	}
	// Text that doesn't read as a time falls back to the last good one.
	draft.value = display(model.value)
}

function step(event: KeyboardEvent, direction: 1 | -1) {
	event.preventDefault()
	const base = parseTimeOfDay(draft.value) ?? model.value ?? {hours: 9, minutes: 0}
	editing.value = false
	model.value = stepTimeOfDay(base, direction * (event.shiftKey ? 60 : 15))
}
</script>

<template>
	<UiInput
		v-bind="$attrs"
		v-model="draft"
		type="text"
		:inputmode="format.hour12 ? 'text' : 'numeric'"
		autocomplete="off"
		spellcheck="false"
		class="font-mono tabular-nums"
		@focus="editing = true"
		@blur="commit"
		@keydown.enter="commit"
		@keydown.up="step($event, 1)"
		@keydown.down="step($event, -1)"
	/>
</template>
