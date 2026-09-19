import {describe, expect, it} from 'vitest'

import {describeUserAgent, deviceName} from './userAgent'

const AGENTS = {
	firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
	chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
	safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
	safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
	chromeIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1',
	chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
	androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	ipad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
	electron: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) some-desktop-app/1.0.0 Chrome/128.0.0.0 Electron/32.0.0 Safari/537.36',
	curl: 'curl/8.22.0',
}

describe('describeUserAgent', () => {
	it.each([
		['firefoxLinux', 'Firefox', 'Linux', 'desktop'],
		['chromeWindows', 'Chrome', 'Windows', 'desktop'],
		['edgeWindows', 'Edge', 'Windows', 'desktop'],
		['safariMac', 'Safari', 'macOS', 'desktop'],
		['safariIphone', 'Safari', 'iOS', 'phone'],
		['chromeIphone', 'Chrome', 'iOS', 'phone'],
		['chromeAndroid', 'Chrome', 'Android', 'phone'],
		['androidTablet', 'Chrome', 'Android', 'tablet'],
		['ipad', 'Safari', 'iPadOS', 'tablet'],
		['electron', 'Norna Desktop', 'Linux', 'desktop'],
		['curl', 'curl', null, 'other'],
	] as const)('%s', (agent, browser, os, kind) => {
		expect(describeUserAgent(AGENTS[agent])).toEqual({browser, os, kind})
	})

	it('knows nothing about an empty agent', () => {
		expect(describeUserAgent(undefined)).toEqual({browser: null, os: null, kind: 'other'})
	})
})

describe('deviceName', () => {
	const t = (key: string, named?: Record<string, unknown>) => named ? `${key} ${JSON.stringify(named)}` : key

	it('names browser and system, or what there is of them', () => {
		expect(deviceName(AGENTS.firefoxLinux, t)).toBe('settingsAccount.sessions.device {"browser":"Firefox","os":"Linux"}')
		expect(deviceName(AGENTS.curl, t)).toBe('curl')
		expect(deviceName('SomeBot/1.0', t)).toBe('SomeBot/1.0')
		expect(deviceName('', t)).toBe('settingsAccount.sessions.unknownDevice')
	})
})
