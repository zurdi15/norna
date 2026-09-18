<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {
	CalendarCell,
	CalendarCellTrigger,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHead,
	CalendarGridRow,
	CalendarHeadCell,
	CalendarHeader,
	CalendarHeading,
	CalendarNext,
	CalendarPrev,
	CalendarRoot,
} from 'reka-ui'
import {CalendarDate, type DateValue} from '@internationalized/date'
import {useI18n} from 'vue-i18n'
import {ChevronLeft, ChevronRight} from '@lucide/vue'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'

const props = withDefaults(defineProps<{
	// 0 = Sunday … 6 = Saturday; callers pass the user's setting.
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
	class?: HTMLAttributes['class']
}>(), {
	weekStartsOn: 1,
	class: undefined,
})

// The app works with JS Dates. Picking a day keeps the time of day already set, if any.
// Clicking the picked day again keeps it: clearing a date is an explicit action of the picker.
const model = defineModel<Date | null>({default: null})

const {t, locale} = useI18n()

const value = computed<DateValue | undefined>({
	get: () => model.value
		? new CalendarDate(model.value.getFullYear(), model.value.getMonth() + 1, model.value.getDate())
		: undefined,
	set: (picked) => {
		if (!picked) {
			model.value = null
			return
		}
		const next = model.value ? new Date(model.value) : new Date(picked.year, 0, 1)
		next.setFullYear(picked.year, picked.month - 1, picked.day)
		model.value = next
	},
})

const navButton = 'grid size-8 cursor-pointer place-items-center rounded-md text-ink-muted hover:bg-canvas-subtle hover:text-ink pointer-coarse:size-10'
</script>

<template>
	<CalendarRoot
		v-slot="{weekDays, grid}"
		v-model="value"
		:locale="locale"
		:week-starts-on="weekStartsOn"
		fixed-weeks
		prevent-deselect
		weekday-format="narrow"
		:class="cn('w-full select-none', props.class)"
	>
		<CalendarHeader class="flex items-center gap-1 pb-2">
			<CalendarHeading
				v-slot="{headingValue}"
				class="flex-1 ps-1 text-sm font-semibold"
			>
				<span class="first-letter:uppercase">{{ headingValue }}</span>
			</CalendarHeading>
			<CalendarPrev
				:class="navButton"
				:aria-label="t('ui.calendar.previous')"
			>
				<UiIcon :icon="ChevronLeft" />
			</CalendarPrev>
			<CalendarNext
				:class="navButton"
				:aria-label="t('ui.calendar.next')"
			>
				<UiIcon :icon="ChevronRight" />
			</CalendarNext>
		</CalendarHeader>
		<CalendarGrid
			v-for="month in grid"
			:key="month.value.toString()"
			class="w-full"
		>
			<CalendarGridHead>
				<CalendarGridRow class="grid grid-cols-7">
					<CalendarHeadCell
						v-for="day in weekDays"
						:key="day"
						class="py-1 text-center caption"
					>
						{{ day }}
					</CalendarHeadCell>
				</CalendarGridRow>
			</CalendarGridHead>
			<CalendarGridBody>
				<CalendarGridRow
					v-for="(week, i) in month.rows"
					:key="i"
					class="grid grid-cols-7"
				>
					<CalendarCell
						v-for="day in week"
						:key="day.toString()"
						:date="day"
						class="grid place-items-center p-px"
					>
						<CalendarCellTrigger
							:day="day"
							:month="month.value"
							class="
								grid size-8 cursor-pointer place-items-center rounded-md font-mono text-xs text-ink
								tabular-nums transition-colors duration-100
								hover:bg-canvas-subtle
								focus-visible:outline-2 focus-visible:outline-accent
								data-disabled:pointer-events-none data-disabled:opacity-40
								data-outside-view:text-ink-faint
								data-selected:bg-accent data-selected:text-on-accent
								data-today:font-semibold data-today:text-accent
								data-today:data-selected:text-on-accent
								pointer-coarse:size-10 pointer-coarse:text-sm
							"
						/>
					</CalendarCell>
				</CalendarGridRow>
			</CalendarGridBody>
		</CalendarGrid>
	</CalendarRoot>
</template>
