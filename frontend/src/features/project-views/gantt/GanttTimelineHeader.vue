<script setup lang="ts">
import {computed} from 'vue'

import {cn} from '@/ui/cn'

import {timelineMonths, timelineWeeks, type GanttScale, type TimelineDay} from './ganttTimeline'
import {useGanttFormat} from './useGanttFormat'

/** Months above days (or weeks), sticking to the top while the rows scroll. */
const props = defineProps<{
	days: TimelineDay[]
	dayWidth: number
	scale: GanttScale
	/** Where the timeline starts inside the scroller: month names stick just after the title column. */
	stickyOffset: number
	todayIndex: number | null
	/** Position of the current moment, in px from the timeline start. */
	nowOffset: number | null
	today: Date
}>()

const format = useGanttFormat(() => props.today)

const months = computed(() => timelineMonths(props.days))
const weeks = computed(() => timelineWeeks(props.days))
</script>

<template>
	<!-- Bars carry their dates in words; the scale is for the eye. -->
	<div
		class="relative"
		:style="{width: `${days.length * dayWidth}px`}"
		aria-hidden="true"
	>
		<div class="relative h-6 border-b border-line">
			<div
				v-for="(month, index) in months"
				:key="month.start"
				:class="cn('absolute inset-y-0 flex items-center overflow-clip', index > 0 && 'border-s border-line-strong')"
				:style="{left: `${month.start * dayWidth}px`, width: `${month.days * dayWidth}px`}"
			>
				<span
					class="sticky px-2 caption whitespace-nowrap"
					:style="{left: `${stickyOffset}px`}"
				>{{ month.days * dayWidth >= 72 ? format.month(month.date) : format.monthShort(month.date) }}</span>
			</div>
		</div>

		<div class="relative h-8">
			<template v-if="scale === 'day'">
				<div
					v-for="day in days"
					:key="day.index"
					:class="cn(
						'absolute inset-y-0 flex flex-col items-center justify-center gap-px leading-none',
						day.weekend ? 'text-ink-faint' : 'text-ink-muted',
					)"
					:style="{left: `${day.index * dayWidth}px`, width: `${dayWidth}px`}"
					:title="format.weekdayLong(day.date)"
				>
					<span class="text-3xs/none uppercase">{{ format.weekday(day.date) }}</span>
					<span
						:class="cn(
							'rounded-sm px-1 py-0.5 font-mono text-2xs/none tabular-nums',
							day.index === todayIndex && 'bg-accent font-medium text-on-accent',
						)"
					>{{ day.date.getDate() }}</span>
				</div>
			</template>
			<template v-else>
				<div
					v-for="(week, index) in weeks"
					:key="week.start"
					:class="cn(
						'absolute inset-y-0 flex items-center overflow-clip ps-1.5 font-mono text-2xs text-ink-muted tabular-nums',
						index > 0 && 'border-s border-line',
					)"
					:style="{left: `${week.start * dayWidth}px`, width: `${week.days * dayWidth}px`}"
					:title="format.weekdayLong(week.date)"
				>
					<span v-if="week.days * dayWidth >= 20">{{ week.date.getDate() }}</span>
				</div>
			</template>
			<span
				v-if="nowOffset !== null"
				class="absolute bottom-0 h-1 w-2 -translate-x-1/2 rounded-t-sm bg-accent"
				:style="{left: `${nowOffset}px`}"
				aria-hidden="true"
			/>
		</div>
	</div>
</template>
