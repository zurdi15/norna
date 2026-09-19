<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Check} from '@lucide/vue'

import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

/** Where a step-by-step import is. Phones name only the current step; the rest are numbers. */
const props = defineProps<{
	steps: {key: string, label: string}[]
	current: string
}>()

const {t} = useI18n()
const currentIndex = computed(() => props.steps.findIndex(step => step.key === props.current))
</script>

<template>
	<ol
		class="flex items-center gap-2"
		:aria-label="t('migration.csv.stepOf', {current: currentIndex + 1, total: steps.length})"
	>
		<li
			v-for="(step, index) in steps"
			:key="step.key"
			class="flex min-w-0 items-center gap-2"
			:aria-current="index === currentIndex ? 'step' : undefined"
		>
			<span
				:class="cn(
					'grid size-5 shrink-0 place-items-center rounded-full font-mono text-2xs tabular-nums',
					index < currentIndex && 'bg-accent text-on-accent',
					index === currentIndex && 'border border-accent text-accent',
					index > currentIndex && 'border border-line-strong text-ink-faint',
				)"
				aria-hidden="true"
			>
				<UiIcon
					v-if="index < currentIndex"
					:icon="Check"
					size="xs"
					:stroke="2.5"
				/>
				<template v-else>{{ index + 1 }}</template>
			</span>
			<span
				:class="cn(
					'truncate text-sm',
					index === currentIndex ? 'font-medium text-ink' : 'text-ink-faint max-md:sr-only',
				)"
			>{{ step.label }}</span>
			<span
				v-if="index < steps.length - 1"
				class="h-px w-4 shrink-0 bg-line md:w-8"
				aria-hidden="true"
			/>
		</li>
	</ol>
</template>
