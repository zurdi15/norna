<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'

import {PRIORITIES} from '@/constants/priorities'
import {cn} from '@/ui/cn'

import {priorityLabelKey} from './priority'

/**
 * Low to high fill three rising bars; urgent and "do now" switch to a marked "!",
 * so the two levels that ask for action read at a glance.
 */
const props = withDefaults(defineProps<{
	priority: number
	// Next to the priority's name the mark is only decoration.
	decorative?: boolean
	class?: HTMLAttributes['class']
}>(), {
	decorative: false,
	class: undefined,
})

const {t} = useI18n()

const label = computed(() => t('tasks.priority.label', {priority: t(priorityLabelKey(props.priority))}))
const urgent = computed(() => props.priority >= PRIORITIES.URGENT)
const BAR_HEIGHTS = ['h-1.25', 'h-2', 'h-3'] as const
</script>

<template>
	<span
		v-if="priority > PRIORITIES.UNSET"
		:role="decorative ? undefined : 'img'"
		:aria-label="decorative ? undefined : label"
		:aria-hidden="decorative || undefined"
		:title="decorative ? undefined : label"
		:class="cn(
			'shrink-0',
			urgent
				? [
					'inline-grid size-4 place-items-center rounded-sm font-mono text-2xs/none font-bold',
					priority >= PRIORITIES.DO_NOW ? 'bg-danger text-on-state' : 'text-warning ring-[1.5px] ring-warning ring-inset',
				]
				: 'inline-flex h-3 items-end gap-px',
			props.class,
		)"
	>
		<template v-if="urgent">!</template>
		<template v-else>
			<span
				v-for="(height, index) in BAR_HEIGHTS"
				:key="height"
				:class="cn('w-0.75 rounded-full', height, index < priority ? 'bg-ink-muted' : 'bg-line-strong')"
			/>
		</template>
	</span>
</template>
