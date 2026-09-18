export type DeviceKind = 'desktop' | 'phone' | 'tablet' | 'other'

export interface DeviceInfo {
	// null when the user agent doesn't say.
	browser: string | null
	os: string | null
	kind: DeviceKind
}

// First match wins: Edge and Opera also claim to be Chrome, and Chrome claims to be Safari.
const BROWSERS: [RegExp, string][] = [
	[/\bEdg(?:e|A|iOS)?\//, 'Edge'],
	[/\bOPR\/|\bOpera\b/, 'Opera'],
	[/\bSamsungBrowser\//, 'Samsung Internet'],
	[/\bVivaldi\//, 'Vivaldi'],
	[/\bElectron\//, 'Norna Desktop'],
	[/\bFirefox\/|\bFxiOS\//, 'Firefox'],
	[/\b(?:Headless)?Chrome\/|\bCriOS\/|\bChromium\//, 'Chrome'],
	[/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
	[/^curl\//, 'curl'],
]

const SYSTEMS: [RegExp, string][] = [
	[/\biPad\b/, 'iPadOS'],
	[/\biPhone\b|\biPod\b/, 'iOS'],
	[/\bAndroid\b/, 'Android'],
	[/\bCrOS\b/, 'ChromeOS'],
	[/\bWindows\b/, 'Windows'],
	[/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
	[/\bLinux\b/, 'Linux'],
]

function firstMatch(userAgent: string, rules: [RegExp, string][]): string | null {
	return rules.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null
}

/**
 * Enough of a user agent to recognise a device in a list: browser, system and form.
 * Not for feature detection; unknown agents come back with nulls.
 */
export function describeUserAgent(userAgent: string | null | undefined): DeviceInfo {
	const agent = userAgent ?? ''
	const os = firstMatch(agent, SYSTEMS)
	const browser = firstMatch(agent, BROWSERS)
	let kind: DeviceKind = 'other'
	if (os === 'iPadOS' || (os === 'Android' && !/\bMobile\b/.test(agent))) {
		kind = 'tablet'
	} else if (os === 'iOS' || os === 'Android') {
		kind = 'phone'
	} else if (os !== null) {
		kind = 'desktop'
	}
	return {browser, os, kind}
}

type Translate = (key: string, named?: Record<string, unknown>) => string

/** "Firefox on Linux", or as much of it as the user agent tells; the raw agent as a last resort. */
export function deviceName(userAgent: string | null | undefined, t: Translate): string {
	const {browser, os} = describeUserAgent(userAgent)
	if (browser && os) {
		return t('settingsAccount.sessions.device', {browser, os})
	}
	return browser ?? os ?? (userAgent || t('settingsAccount.sessions.unknownDevice'))
}
