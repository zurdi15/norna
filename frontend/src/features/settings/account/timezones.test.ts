import {describe, expect, it} from 'vitest'

import {timezoneLabel, timezoneOffset, timezoneOptions} from './timezones'

// Summer and winter in Madrid.
const JULY = new Date(Date.UTC(2026, 6, 1, 12))
const JANUARY = new Date(Date.UTC(2026, 0, 1, 12))

describe('timezones', () => {
	it('reads underscores as spaces', () => {
		expect(timezoneLabel('America/Argentina/Buenos_Aires')).toBe('America/Argentina/Buenos Aires')
	})

	it('gives the offset on the given day', () => {
		expect(timezoneOffset('Europe/Madrid', JULY)).toBe('GMT+2')
		expect(timezoneOffset('Europe/Madrid', JANUARY)).toBe('GMT+1')
		expect(timezoneOffset('Asia/Kolkata', JULY)).toBe('GMT+5:30')
	})

	it('leaves the offset empty for zones Intl does not know', () => {
		expect(timezoneOffset('Not/A_Zone', JULY)).toBe('')
		expect(timezoneOptions(['Not/A_Zone', 'Europe/Madrid'], JULY)).toEqual([
			{id: 'Not/A_Zone', label: 'Not/A Zone', offset: ''},
			{id: 'Europe/Madrid', label: 'Europe/Madrid', offset: 'GMT+2'},
		])
	})
})
