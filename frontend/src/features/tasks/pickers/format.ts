import {SECONDS_A_DAY} from '@/constants/date'
import {startOfDay} from '@/helpers/time/dateMath'

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = `${locale}|${JSON.stringify(options)}`
	let cached = formatters.get(key)
	if (!cached) {
		cached = new Intl.DateTimeFormat(locale, options)
		formatters.set(key, cached)
	}
	return cached
}

/** The day a date shortcut lands on: "vie 25" within the next two weeks, "30 sept" further out. */
export function formatDayHint(date: Date, now: Date, locale: string): string {
	const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / (SECONDS_A_DAY * 1000))
	if (days >= 0 && days < 14) {
		// From parts: English would otherwise put the day first ("18 Fri").
		const parts = formatter(locale, {weekday: 'short', day: 'numeric'}).formatToParts(date)
		const weekday = parts.find(part => part.type === 'weekday')?.value ?? ''
		const day = parts.find(part => part.type === 'day')?.value ?? ''
		return `${weekday} ${day}`
	}
	return formatter(locale, date.getFullYear() === now.getFullYear()
		? {day: 'numeric', month: 'short'}
		: {day: 'numeric', month: 'short', year: 'numeric'},
	).format(date)
}
