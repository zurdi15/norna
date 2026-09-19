import {formatDateSince} from '@/helpers/time/formatDate'

/** A day without its time, the way expiry dates read: "18 Oct 2026". */
export function formatDay(date: Date | string, locale: string): string {
	const parsed = typeof date === 'string' ? new Date(date) : date
	return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(locale, {dateStyle: 'medium'}).format(parsed)
}

/** An expiry date that has already gone by (a missing one never expires). */
export function hasExpired(expiresAt: string | undefined, now: Date): boolean {
	return expiresAt !== undefined && new Date(expiresAt).getTime() <= now.getTime()
}

/** "2 hours ago"; a moment ahead of the (minute-ticking) clock still reads as just now. */
export function formatAgo(date: string, now: Date): string {
	return formatDateSince(new Date(Math.min(new Date(date).getTime(), now.getTime())))
}
