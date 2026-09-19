<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef, watch, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'

import {describeRepeatInterval, readRepeat, type RepeatSettings} from '@/modules/task/describe'
import {REPEAT_TYPES, type IRepeatAfter, type IRepeatType} from '@/types/IRepeatAfter'
import {cn} from '@/ui/cn'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import {
	CUSTOM_REPEAT_UNITS,
	DEFAULT_CUSTOM_REPEAT,
	noRepeat,
	presetRepeatSettings,
	REPEAT_PRESETS,
	repeatPresetFor,
	toRepeatSettings,
	type RepeatPresetKey,
} from './repeat'

/**
 * A task's repeat: presets, a custom "every N units", and whether the next date counts
 * from completion. Picking a preset emits `select` so callers can close.
 */
const props = withDefaults(defineProps<{
	class?: HTMLAttributes['class']
}>(), {
	class: undefined,
})

const emit = defineEmits<{
	select: [value: RepeatSettings]
}>()

const model = defineModel<RepeatSettings>({default: noRepeat})

const {t} = useI18n()

const current = computed(() => readRepeat(model.value.repeat_after, model.value.repeat_mode))

const matchesNoPreset = () => repeatPresetFor(current.value.interval) === null
// Stays on while the custom form is open, even when its value happens to match a preset.
const customOpen = ref(matchesNoPreset())

type OptionKey = RepeatPresetKey | 'custom'

const PRESET_KEYS = ['daily', 'weekly', 'monthly', 'yearly'] as const

const options = computed<{key: OptionKey, label: string}[]>(() => [
	{key: 'none', label: t('pickers.repeat.none')},
	...PRESET_KEYS.map(key => ({key, label: describeRepeatInterval(REPEAT_PRESETS[key], t)})),
	{key: 'custom', label: t('misc.custom')},
])

const selected = computed<OptionKey>(() => customOpen.value
	? 'custom'
	: repeatPresetFor(current.value.interval) ?? 'custom')

// The custom form is the source of truth while open: reading "30 days" back from the
// api would come out as "1 month" and swap the unit under the user's fingers.
const amount = ref<string | number | null>('')
const unit = ref<IRepeatType>(DEFAULT_CUSTOM_REPEAT.type)

function loadCustom() {
	const interval = current.value.interval ?? DEFAULT_CUSTOM_REPEAT
	amount.value = String(interval.amount)
	unit.value = interval.type
}
loadCustom()

const customInterval = computed<IRepeatAfter | null>(() => {
	const value = Math.round(Number(amount.value))
	return Number.isFinite(value) && value >= 1 ? {type: unit.value, amount: value} : null
})

watch(customInterval, interval => {
	if (customOpen.value && interval) {
		model.value = toRepeatSettings(interval, current.value.fromCompletion)
	}
})

const root = useTemplateRef<HTMLElement>('root')

async function pick(key: OptionKey) {
	if (key === 'custom') {
		customOpen.value = true
		loadCustom()
		model.value = toRepeatSettings(customInterval.value, current.value.fromCompletion)
		await nextTick()
		root.value?.querySelector<HTMLInputElement>('[data-repeat-amount]')?.focus()
		return
	}
	customOpen.value = false
	model.value = presetRepeatSettings(key, model.value)
	emit('select', model.value)
}

const fromCompletion = computed({
	get: () => current.value.fromCompletion,
	set: value => {
		const interval = customOpen.value ? customInterval.value : current.value.interval
		if (interval) {
			model.value = toRepeatSettings(interval, value)
		}
	},
})

function unitLabel(type: IRepeatType, count: number): string {
	return type === REPEAT_TYPES.Months
		? t('pickers.repeat.months', count)
		: t(`time.units.${type}`, count)
}

const unitItems = computed(() => {
	// Intervals set elsewhere (quick add, the api) can use a unit the form doesn't offer.
	const units = CUSTOM_REPEAT_UNITS.includes(unit.value) ? CUSTOM_REPEAT_UNITS : [unit.value, ...CUSTOM_REPEAT_UNITS]
	const count = Number(amount.value) || 0
	return units.map(type => ({value: type, label: unitLabel(type, count)}))
})

const showMonthsHint = computed(() => {
	const interval = customOpen.value ? customInterval.value : current.value.interval
	return interval?.type === REPEAT_TYPES.Months && (interval.amount > 1 || current.value.fromCompletion)
})

const section = 'px-3 pointer-coarse:px-4'
</script>

<template>
	<div
		ref="root"
		:class="cn('flex flex-col', props.class)"
	>
		<UiListbox
			:model-value="selected"
			:items="options"
			:item-key="option => option.key"
			:item-label="option => option.label"
			:searchable="false"
			:label="t('task.attributes.repeat')"
			@select="pick"
		/>

		<div
			v-if="customOpen"
			:class="cn('flex items-center gap-2 border-t border-line py-3', section)"
		>
			<span class="text-sm text-ink-muted">{{ t('pickers.repeat.everyPrefix') }}</span>
			<UiField
				:label="t('pickers.repeat.amount')"
				hide-label
				class="w-20 shrink-0"
			>
				<UiInput
					v-model="amount"
					type="number"
					min="1"
					inputmode="numeric"
					data-repeat-amount
					class="min-w-0 font-mono tabular-nums"
				/>
			</UiField>
			<UiField
				:label="t('pickers.repeat.unit')"
				hide-label
				class="min-w-0 flex-1"
			>
				<UiSelect
					v-model="unit"
					:items="unitItems"
				/>
			</UiField>
		</div>
		<p
			v-if="showMonthsHint"
			:class="cn('-mt-1 pb-3 text-xs text-ink-faint', section)"
		>
			{{ t('pickers.repeat.monthsHint') }}
		</p>

		<label
			v-if="current.interval"
			:class="cn('flex cursor-pointer items-start gap-3 border-t border-line py-3', section)"
		>
			<span class="min-w-0 flex-1">
				<span class="block text-base pointer-coarse:text-md">{{ t('pickers.repeat.fromCompletionToggle') }}</span>
				<span class="mt-0.5 block text-xs text-ink-faint">
					{{ fromCompletion ? t('pickers.repeat.hintFromCompletion') : t('pickers.repeat.hintFromDate') }}
				</span>
			</span>
			<UiSwitch
				v-model="fromCompletion"
				class="mt-0.5"
			/>
		</label>
	</div>
</template>
