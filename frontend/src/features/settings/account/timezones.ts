export interface TimezoneOption {
	id: string
	label: string
	// "GMT+2" right now; empty when the browser doesn't know the zone.
	offset: string
}

/** "America/Argentina/Buenos_Aires" reads as "America/Argentina/Buenos Aires". */
export function timezoneLabel(timezone: string): string {
	return timezone.replace(/_/g, ' ')
}

export function timezoneOffset(timezone: string, at: Date): string {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, timeZoneName: 'shortOffset'}).formatToParts(at)
		return parts.find(part => part.type === 'timeZoneName')?.value ?? ''
	} catch {
		// Hosts list zones (and aliases) that Intl may not accept.
		return ''
	}
}

export function timezoneOptions(timezones: readonly string[], at: Date): TimezoneOption[] {
	return timezones.map(id => ({id, label: timezoneLabel(id), offset: timezoneOffset(id, at)}))
}
