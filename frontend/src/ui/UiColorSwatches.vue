<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {Ban, Pipette} from '@lucide/vue'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'
import {toCssHex} from '@/helpers/color/toCssHex'

const props = withDefaults(defineProps<{
	label: string
	// Offer a "no color" swatch that sets the model to ''.
	clearable?: boolean
	class?: HTMLAttributes['class']
}>(), {
	clearable: true,
	class: undefined,
})

// '#rrggbb', or '' for no color.
const model = defineModel<string>({default: ''})

const {t} = useI18n()

// Nordic palette at one lightness (oklch L 0.62) so every swatch works on both themes.
const SWATCHES = [
	{hex: '#418ad1', name: 'fjord'},
	{hex: '#1f93b8', name: 'glacier'},
	{hex: '#1d9999', name: 'sound'},
	{hex: '#249c74', name: 'aurora'},
	{hex: '#5d9850', name: 'moss'},
	{hex: '#9f8400', name: 'birch'},
	{hex: '#c06f0a', name: 'ember'},
	{hex: '#cf6139', name: 'rust'},
	{hex: '#d95256', name: 'lingon'},
	{hex: '#c35f92', name: 'heather'},
	{hex: '#9a6ec9', name: 'violet'},
	{hex: '#7a8798', name: 'slate'},
] as const

const current = computed(() => toCssHex(model.value)?.toLowerCase() ?? '')
const isCustom = computed(() => current.value !== '' && !SWATCHES.some(s => s.hex === current.value))

const swatchClass = 'relative grid size-7 cursor-pointer place-items-center rounded-md ring-offset-2 ring-offset-surface transition-shadow duration-150 pointer-coarse:size-9'
</script>

<template>
	<div
		role="radiogroup"
		:aria-label="label"
		:class="cn('flex flex-wrap gap-2', props.class)"
	>
		<button
			v-if="clearable"
			type="button"
			role="radio"
			:aria-checked="current === ''"
			:aria-label="t('ui.color.none')"
			:class="cn(swatchClass, 'border border-line-strong text-ink-faint', current === '' && 'ring-2 ring-accent')"
			@click="model = ''"
		>
			<UiIcon
				:icon="Ban"
				size="sm"
			/>
		</button>
		<button
			v-for="swatch in SWATCHES"
			:key="swatch.hex"
			type="button"
			role="radio"
			:aria-checked="current === swatch.hex"
			:aria-label="t(`ui.color.swatches.${swatch.name}`)"
			:class="cn(swatchClass, current === swatch.hex && 'ring-2 ring-accent')"
			:style="{backgroundColor: swatch.hex}"
			@click="model = swatch.hex"
		/>
		<label
			:class="cn(swatchClass, 'border border-dashed border-line-strong text-ink-muted', isCustom && 'ring-2 ring-accent')"
			:style="isCustom ? {backgroundColor: current, borderStyle: 'solid'} : undefined"
		>
			<UiIcon
				v-if="!isCustom"
				:icon="Pipette"
				size="sm"
			/>
			<span class="sr-only">{{ t('ui.color.custom') }}</span>
			<input
				type="color"
				class="absolute inset-0 cursor-pointer opacity-0"
				:value="current || '#418ad1'"
				@input="model = ($event.target as HTMLInputElement).value"
			>
		</label>
	</div>
</template>
