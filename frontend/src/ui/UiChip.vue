<script setup lang="ts">
import {computed, type Component, type HTMLAttributes} from 'vue'
import {cva} from 'class-variance-authority'
import {Primitive} from 'reka-ui'
import {X} from '@lucide/vue'
import {useI18n} from 'vue-i18n'

import {cn} from './cn'
import UiColorDot from './UiColorDot.vue'
import UiIcon from './UiIcon.vue'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const props = withDefaults(defineProps<{
	tone?: Tone
	size?: 'sm' | 'md'
	// Renders as a toggle button; pressed chips switch to the accent tone.
	as?: string | Component
	pressed?: boolean
	// Label color from the API: shown as a dot before the text.
	color?: string | null
	icon?: Component
	removable?: boolean
	// Names the remove button, e.g. the label title.
	label?: string
	class?: HTMLAttributes['class']
}>(), {
	tone: 'neutral',
	size: 'md',
	as: 'span',
	pressed: undefined,
	color: undefined,
	icon: undefined,
	removable: false,
	label: undefined,
	class: undefined,
})

const emit = defineEmits<{
	remove: []
}>()

const {t} = useI18n()

const chipVariants = cva(
	'inline-flex max-w-full items-center gap-1.5 rounded-sm border whitespace-nowrap transition-colors duration-150',
	{
		variants: {
			tone: {
				neutral: 'border-line bg-surface text-ink',
				accent: 'border-accent-line bg-accent-subtle text-accent',
				success: 'border-success/35 bg-success-subtle text-success',
				warning: 'border-warning/40 bg-warning-subtle text-warning',
				danger: 'border-danger/35 bg-danger-subtle text-danger',
			},
			size: {
				sm: 'h-5 px-1.5 text-xs',
				md: 'h-6 px-2 text-sm pointer-coarse:h-7',
			},
			interactive: {
				true: 'cursor-pointer hover:border-line-strong',
			},
		},
	},
)

const isButton = computed(() => props.as !== 'span')
const effectiveTone = computed<Tone>(() => props.pressed ? 'accent' : props.tone)
</script>

<template>
	<Primitive
		:as="as"
		:type="as === 'button' ? 'button' : undefined"
		:aria-pressed="pressed === undefined ? undefined : String(pressed)"
		:class="cn(chipVariants({tone: effectiveTone, size, interactive: isButton}), props.class)"
	>
		<UiColorDot
			v-if="color !== undefined"
			:color="color"
		/>
		<UiIcon
			v-else-if="icon"
			:icon="icon"
			size="sm"
			:class="effectiveTone === 'neutral' ? 'text-ink-muted' : undefined"
		/>
		<span class="truncate"><slot /></span>
		<button
			v-if="removable"
			type="button"
			class="
				-me-1 grid size-4 cursor-pointer place-items-center rounded-sm text-ink-faint
				hover:bg-canvas-subtle hover:text-ink
			"
			:aria-label="label ? t('ui.chip.removeNamed', {label}) : t('ui.chip.remove')"
			@click.stop="emit('remove')"
		>
			<UiIcon
				:icon="X"
				size="xs"
			/>
		</button>
	</Primitive>
</template>
