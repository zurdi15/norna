import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {TIME_FORMAT} from '@/constants/timeFormat'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTimeFormat} from '@/composables/useTimeFormat'
import {
	dueState,
	formatLongDate,
	formatTaskDate,
	formatTaskDateTime,
	formatTime,
	type DueState,
} from '@/modules/task/dueDate'

/** Task date formatting bound to the UI language, the user's clock and the ticking now. */
export function useTaskDateFormat() {
	const {locale} = useI18n()
	const {now} = useGlobalNow()
	const {store: timeFormat} = useTimeFormat()

	const options = computed(() => ({
		locale: locale.value,
		hour12: timeFormat.value === TIME_FORMAT.HOURS_12,
	}))

	return {
		now,
		options,
		short: (date: Date) => formatTaskDate(date, now.value, options.value),
		dateTime: (date: Date) => formatTaskDateTime(date, now.value, options.value),
		long: (date: Date) => formatLongDate(date, now.value, options.value),
		time: (date: Date) => formatTime(date, options.value),
		state: (date: Date): DueState => dueState(date, now.value),
	}
}
