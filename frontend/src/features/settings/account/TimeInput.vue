<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useTimeFormat} from '@/composables/useTimeFormat'
import {TIME_FORMAT} from '@/constants/timeFormat'
import {formatTimeOfDay, parseTimeOfDay, stepTimeOfDay, type TimeOfDay} from '@/helpers/time/timeOfDay'
import UiInput from '@/ui/UiInput.vue'

/**
 * A time setting written in the user's own clock ("16:30" or "4:30 PM"), which a native
 * time field ignores. Saves as "HH:MM" on Enter or blur; up and down move it 15 minutes.
 * Other attributes go to the input.
 */
const props = withDefaults(defineProps<{
	// "HH:MM", or empty for none. The API also sends "9:00".
	value: string
	// Without it, clearing the field saves "no time" (and an empty field shows no example).
	required?: boolean
}>(), {
	required: false,
})

const emit = defineEmits<{
	commit: [value: string]
}>()

defineOptions({inheritAttrs: false})

const {locale} = useI18n()
const {store: timeFormat} = useTimeFormat()
const hour12 = computed(() => timeFormat.value === TIME_FORMAT.HOURS_12)

const stored = computed(() => parseTimeOfDay(props.value))
const display = (time: TimeOfDay | null) => time ? formatTimeOfDay(time, {locale: locale.value, hour12: hour12.value}) : ''
const toValue = (time: TimeOfDay) => `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`

const draft = ref('')
const editing = ref(false)
watch([stored, hour12, locale], () => {
	if (!editing.value) {
		draft.value = display(stored.value)
	}
}, {immediate: true})

function save(time: TimeOfDay | null) {
	const value = time ? toValue(time) : ''
	if (value !== (stored.value ? toValue(stored.value) : '')) {
		emit('commit', value)
	}
}

function commit() {
	editing.value = false
	const parsed = parseTimeOfDay(draft.value)
	if (parsed || (draft.value.trim() === '' && !props.required)) {
		save(parsed)
	}
	// Unreadable text falls back to the saved time.
	draft.value = display(parsed ?? (draft.value.trim() === '' && !props.required ? null : stored.value))
}

function step(event: KeyboardEvent, direction: 1 | -1) {
	event.preventDefault()
	const base = parseTimeOfDay(draft.value) ?? stored.value ?? {hours: 9, minutes: 0}
	const next = stepTimeOfDay(base, direction * 15)
	editing.value = true
	draft.value = display(next)
}
</script>

<template>
	<UiInput
		v-bind="$attrs"
		v-model="draft"
		type="text"
		:inputmode="hour12 ? 'text' : 'numeric'"
		autocomplete="off"
		spellcheck="false"
		:placeholder="required ? display({hours: 9, minutes: 0}) : undefined"
		@input="editing = true"
		@blur="commit"
		@keydown.enter.prevent="commit"
		@keydown.up="step($event, 1)"
		@keydown.down="step($event, -1)"
	/>
</template>
