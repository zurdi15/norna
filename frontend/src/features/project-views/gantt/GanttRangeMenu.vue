<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {CalendarRange, Check, ChevronDown} from '@lucide/vue'

import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSeparator from '@/ui/UiSeparator.vue'

import {
	GANTT_RANGE_PRESETS,
	matchRangePreset,
	normalizeRange,
	presetRange,
	type GanttRange,
	type GanttRangePreset,
} from './ganttRange'
import {useGanttFormat} from './useGanttFormat'

/** The range button and its menu: presets, or any two days picked on the calendar. */
const props = defineProps<{
	now: Date
}>()

const range = defineModel<GanttRange>('range', {required: true})

const {t} = useI18n()
const authStore = useAuthStore()
const format = useGanttFormat(() => props.now)

const open = ref(false)
const activePreset = computed(() => matchRangePreset(range.value, props.now))

function pickPreset(preset: GanttRangePreset) {
	range.value = presetRange(preset, props.now)
	open.value = false
}

type Edge = 'from' | 'to'
const edge = ref<Edge>('from')
watch(open, isOpen => {
	if (isOpen) {
		edge.value = 'from'
	}
})

const edges = computed(() => [
	{value: 'from' as const, label: `${t('projectView.gantt.from')} ${format.day(range.value.from)}`},
	{value: 'to' as const, label: `${t('projectView.gantt.to')} ${format.day(range.value.to)}`},
])

// Picking the start moves on to the end; a start after the end (or the reverse) makes a one-day range.
const calendarDay = computed<Date | null>({
	get: () => edge.value === 'from' ? range.value.from : range.value.to,
	set: day => {
		if (!day) return
		if (edge.value === 'from') {
			range.value = normalizeRange(day, day > range.value.to ? day : range.value.to)
			edge.value = 'to'
		} else {
			range.value = normalizeRange(day < range.value.from ? day : range.value.from, day)
		}
	},
})
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="t('projectView.gantt.range')"
		class="w-80"
	>
		<template #trigger>
			<button
				type="button"
				:class="cn(
					'inline-flex h-7 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2.5',
					'text-ink transition-colors hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-accent',
					'pointer-coarse:h-10',
				)"
				:aria-label="`${t('projectView.gantt.range')}: ${format.span({start: range.from, end: range.to})}`"
			>
				<UiIcon
					:icon="CalendarRange"
					size="sm"
					class="text-ink-faint"
				/>
				<span class="truncate font-mono text-xs tabular-nums">{{ format.span({start: range.from, end: range.to}) }}</span>
				<UiIcon
					:icon="ChevronDown"
					size="xs"
					class="text-ink-faint"
				/>
			</button>
		</template>

		<div class="grid gap-2 p-2 pointer-coarse:px-4">
			<div
				role="group"
				:aria-label="t('projectView.gantt.range')"
				class="grid"
			>
				<button
					v-for="preset in GANTT_RANGE_PRESETS"
					:key="preset"
					type="button"
					:aria-pressed="activePreset === preset"
					class="
						flex h-8 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-sm text-ink
						hover:bg-canvas-subtle
						focus-visible:outline-2 focus-visible:outline-accent
						pointer-coarse:h-11 pointer-coarse:text-md
					"
					@click="pickPreset(preset)"
				>
					{{ t(`projectView.gantt.presets.${preset}`) }}
					<UiIcon
						v-if="activePreset === preset"
						:icon="Check"
						size="sm"
						class="text-accent"
					/>
				</button>
			</div>

			<!-- Room for more view options where the menu is the only place for them (phones). -->
			<slot />

			<UiSeparator />

			<div class="grid gap-2 px-1">
				<p class="px-1 pt-1 caption">
					{{ t('projectView.gantt.custom') }}
				</p>
				<UiSegmented
					v-model="edge"
					:items="edges"
					:label="t('projectView.gantt.custom')"
					size="sm"
					class="grid grid-cols-2"
				/>
				<UiCalendar
					v-model="calendarDay"
					:week-starts-on="authStore.settings.week_start"
				/>
			</div>
		</div>
	</UiAdaptivePopover>
</template>
