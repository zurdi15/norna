<script setup lang="ts">
import {nextTick, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import type {BoardBucket} from '@/client/queries/taskBoard'
import {cn} from '@/ui/cn'

import {bucketCountLabel, isBucketFull} from './kanban'

/** Phones: one chip per column, marking the one in view; a tap scrolls the board to it. */
const props = defineProps<{
	buckets: readonly BoardBucket[]
	active: number
}>()

const emit = defineEmits<{
	select: [index: number]
}>()

const {t} = useI18n()
const row = useTemplateRef<HTMLElement>('row')

// Keeps the chip of the column in view inside the row, without scrolling the page.
watch(() => props.active, async index => {
	await nextTick()
	const container = row.value
	const chip = container?.children[index] as HTMLElement | undefined
	if (!container || !chip) {
		return
	}
	const start = chip.offsetLeft - 16
	const end = chip.offsetLeft + chip.offsetWidth + 16 - container.clientWidth
	if (container.scrollLeft > start) {
		container.scrollTo({left: start, behavior: 'smooth'})
	} else if (container.scrollLeft < end) {
		container.scrollTo({left: end, behavior: 'smooth'})
	}
})
</script>

<template>
	<nav
		:aria-label="t('kanban.columns')"
		class="shrink-0"
	>
		<div
			ref="row"
			class="relative flex scrollbar-none gap-1.5 overflow-x-auto px-4 py-1"
		>
			<!-- The chips are 32px tall; the padding around them makes the 44px target. -->
			<button
				v-for="(bucket, index) in buckets"
				:key="bucket.id"
				type="button"
				:aria-current="index === active || undefined"
				class="flex h-11 shrink-0 cursor-pointer items-center"
				@click="emit('select', index)"
			>
				<span
					:class="cn(
						'flex h-8 max-w-48 items-center gap-2 rounded-sm border px-3 text-sm whitespace-nowrap transition-colors',
						index === active ? 'border-accent-line bg-accent-subtle text-accent' : 'border-line bg-surface text-ink',
					)"
				>
					<span class="truncate">{{ bucket.title }}</span>
					<span
						:class="cn(
							'font-mono text-2xs tabular-nums',
							isBucketFull(bucket) ? 'text-warning' : index === active ? 'text-accent' : 'text-ink-faint',
						)"
					>{{ bucketCountLabel(bucket) }}</span>
				</span>
			</button>
		</div>
	</nav>
</template>
