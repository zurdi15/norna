import type {TimeEntry} from '@/client/generated'

type EntryTimes = Pick<TimeEntry, 'start_time' | 'end_time'>

/** Tracked whole seconds; a running entry counts up to now. */
export function entrySeconds(entry: EntryTimes, now: Date): number {
	if (!entry.start_time) {
		return 0
	}
	const start = new Date(entry.start_time).getTime()
	const end = entry.end_time ? new Date(entry.end_time).getTime() : now.getTime()
	return Math.max(0, Math.floor((end - start) / 1000))
}

export function totalSeconds(entries: readonly EntryTimes[], now: Date): number {
	return entries.reduce((sum, entry) => sum + entrySeconds(entry, now), 0)
}

/** Totals and rows: "2h 05m", "45m". */
export function formatDuration(seconds: number): string {
	const minutes = Math.floor(Math.max(0, seconds) / 60)
	const hours = Math.floor(minutes / 60)
	const rest = minutes % 60
	return hours > 0 ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${rest}m`
}

/** The running clock: "0:04:09", "1:02:33". */
export function formatElapsed(seconds: number): string {
	const whole = Math.floor(Math.max(0, seconds))
	const pad = (value: number) => String(value).padStart(2, '0')
	return `${Math.floor(whole / 3600)}:${pad(Math.floor(whole % 3600 / 60))}:${pad(whole % 60)}`
}

const UNITS = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)(?:m(?:in)?)?)?$/

/**
 * Minutes from what people type into a duration field: "1h 30m", "1h30", "90m",
 * "90 min", "1:30", "1.5h", "1,5" (hours) and a bare "45" (minutes). Null when it
 * doesn't read as a positive duration.
 */
export function parseDuration(text: string): number | null {
	const compact = text.toLowerCase().replace(/\s+/g, '').replace(',', '.')
	let minutes: number | null = null
	const clock = /^(\d+):(\d{1,2})$/.exec(compact)
	const units = UNITS.exec(compact)
	if (clock) {
		minutes = Number(clock[2]) < 60 ? Number(clock[1]) * 60 + Number(clock[2]) : null
	} else if (/^\d+$/.test(compact)) {
		minutes = Number(compact)
	} else if (/^\d*\.\d+$/.test(compact)) {
		minutes = Math.round(Number(compact) * 60)
	} else if (units && (units[1] !== undefined || units[2] !== undefined)) {
		minutes = Math.round(Number(units[1] ?? 0) * 60) + Number(units[2] ?? 0)
	}
	return minutes !== null && minutes > 0 ? minutes : null
}
