import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {GanttDaySpan} from '@/composables/useGanttBar'

/** Dates as the chart prints them, in the UI language. */
export function useGanttFormat(today: () => Date) {
	const {locale} = useI18n()

	const formats = computed(() => ({
		day: new Intl.DateTimeFormat(locale.value, {day: 'numeric', month: 'short'}),
		dayWithYear: new Intl.DateTimeFormat(locale.value, {day: 'numeric', month: 'short', year: 'numeric'}),
		month: new Intl.DateTimeFormat(locale.value, {month: 'long', year: 'numeric'}),
		monthShort: new Intl.DateTimeFormat(locale.value, {month: 'short'}),
		weekday: new Intl.DateTimeFormat(locale.value, {weekday: 'narrow'}),
		weekdayLong: new Intl.DateTimeFormat(locale.value, {weekday: 'long', day: 'numeric', month: 'long'}),
	}))

	/** "16 sep", with the year only when it isn't this one. */
	function day(date: Date): string {
		const sameYear = date.getFullYear() === today().getFullYear()
		return (sameYear ? formats.value.day : formats.value.dayWithYear).format(date)
	}

	/** "16 sep – 20 sep"; one year at the end when both share one that isn't this year. */
	function span({start, end}: GanttDaySpan): string {
		const sameYear = start.getFullYear() === end.getFullYear()
		const first = sameYear && start.getFullYear() !== today().getFullYear()
			? formats.value.day.format(start)
			: day(start)
		return `${first} – ${day(end)}`
	}

	return {
		day,
		span,
		month: (date: Date) => formats.value.month.format(date),
		monthShort: (date: Date) => formats.value.monthShort.format(date),
		weekday: (date: Date) => formats.value.weekday.format(date),
		weekdayLong: (date: Date) => formats.value.weekdayLong.format(date),
	}
}
