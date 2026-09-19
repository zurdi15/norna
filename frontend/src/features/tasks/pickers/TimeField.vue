<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {Clock} from '@lucide/vue'

import {useTimeFormat} from '@/composables/useTimeFormat'
import {TIME_FORMAT} from '@/constants/timeFormat'
import {
	formatTimeOfDay,
	isSameTimeOfDay,
	parseTimeOfDay,
	stepTimeOfDay,
	type TimeOfDay,
} from '@/helpers/time/timeOfDay'
import {cn} from '@/ui/cn'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'

const props = withDefaults(defineProps<{
	// What an empty field would get; shown as its placeholder.
	placeholder?: TimeOfDay | null
}>(), {
	placeholder: null,
})

const emit = defineEmits<{
	// Enter in the field: the time is done, callers may close.
	commit: []
}>()

const model = defineModel<TimeOfDay | null>({default: null})

const {t, locale} = useI18n()
const {store: timeFormat} = useTimeFormat()

const id = useId()
const hour12 = computed(() => timeFormat.value === TIME_FORMAT.HOURS_12)
const format = computed(() => ({locale: locale.value, hour12: hour12.value}))
const display = (time: TimeOfDay | null) => time ? formatTimeOfDay(time, format.value) : ''

// Morning, noon, evening: three fit next to the field even in a narrow popover.
const PRESETS: TimeOfDay[] = [9, 12, 18].map(hours => ({hours, minutes: 0}))
// On a 12-hour clock the presets drop the ":00" to stay on one line ("9 AM").
const presetFormatter = computed(() => hour12.value ? new Intl.DateTimeFormat(locale.value, {hour: 'numeric', hour12: true}) : null)
const presetLabel = (time: TimeOfDay) => presetFormatter.value?.format(new Date(2000, 0, 1, time.hours)) ?? display(time)

// The text being typed; it only becomes the time on Enter or blur, so "1" on the way to "14:30" doesn't jump.
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
	// A time that didn't parse falls back to the last good one.
	draft.value = display(model.value)
}

function onEnter() {
	commit()
	emit('commit')
}

function step(event: KeyboardEvent, direction: 1 | -1) {
	event.preventDefault()
	const base = parseTimeOfDay(draft.value) ?? model.value ?? props.placeholder ?? {hours: 9, minutes: 0}
	editing.value = false
	model.value = stepTimeOfDay(base, direction * (event.shiftKey ? 60 : 15))
}
</script>

<template>
	<div class="flex flex-wrap items-center gap-x-2.5 gap-y-2">
		<label
			:for="id"
			class="flex shrink-0 items-center text-ink-faint"
		>
			<UiIcon :icon="Clock" />
			<span class="sr-only">{{ t('pickers.date.time') }}</span>
		</label>
		<UiInput
			:id="id"
			v-model="draft"
			type="text"
			:inputmode="hour12 ? 'text' : 'numeric'"
			autocomplete="off"
			spellcheck="false"
			:placeholder="display(placeholder)"
			:class="cn('font-mono tabular-nums', hour12 ? 'w-30 pointer-coarse:w-36' : 'w-21')"
			@focus="editing = true"
			@blur="commit"
			@keydown.enter.prevent="onEnter"
			@keydown.up="step($event, 1)"
			@keydown.down="step($event, -1)"
		/>
		<div
			role="group"
			:aria-label="t('pickers.date.timePresets')"
			class="ms-auto flex flex-wrap gap-1"
		>
			<UiChip
				v-for="preset in PRESETS"
				:key="preset.hours"
				as="button"
				:pressed="isSameTimeOfDay(preset, model)"
				class="h-7 px-2 font-mono text-xs tabular-nums pointer-coarse:h-11 pointer-coarse:px-2.5 pointer-coarse:text-sm"
				@click="model = preset"
			>
				{{ presetLabel(preset) }}
			</UiChip>
		</div>
	</div>
</template>
