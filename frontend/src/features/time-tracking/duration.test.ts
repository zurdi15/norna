import {describe, expect, it} from 'vitest'

import {entrySeconds, formatDuration, formatElapsed, parseDuration, totalSeconds} from './duration'

describe('durations', () => {
	const now = new Date('2026-09-18T12:00:00Z')

	it('counts a finished entry and a running one up to now', () => {
		const finished = {start_time: '2026-09-18T09:00:00Z', end_time: '2026-09-18T10:30:00Z'}
		const running = {start_time: '2026-09-18T11:45:00Z', end_time: null}

		expect(entrySeconds(finished, now)).toBe(5400)
		expect(entrySeconds(running, now)).toBe(900)
		expect(totalSeconds([finished, running], now)).toBe(6300)
		expect(entrySeconds({start_time: undefined}, now)).toBe(0)
	})

	it('writes totals as hours and minutes', () => {
		expect(formatDuration(0)).toBe('0m')
		expect(formatDuration(59)).toBe('0m')
		expect(formatDuration(45 * 60)).toBe('45m')
		expect(formatDuration(2 * 3600 + 5 * 60)).toBe('2h 05m')
		expect(formatDuration(50 * 3600)).toBe('50h 00m')
	})

	it('writes the running clock with seconds', () => {
		expect(formatElapsed(0)).toBe('0:00:00')
		expect(formatElapsed(249)).toBe('0:04:09')
		expect(formatElapsed(3753)).toBe('1:02:33')
	})

	it.each([
		['1h 30m', 90],
		['1h30', 90],
		['1H30M', 90],
		['90m', 90],
		['90 min', 90],
		['1:30', 90],
		['1.5h', 90],
		['1,5', 90],
		['.5', 30],
		['2h', 120],
		['45', 45],
	])('reads "%s" as %i minutes', (text, minutes) => {
		expect(parseDuration(text)).toBe(minutes)
	})

	it.each(['', '0', '0m', 'abc', '1:75', 'h', '1h 30m 10s', '-5'])('rejects "%s"', text => {
		expect(parseDuration(text)).toBeNull()
	})
})
