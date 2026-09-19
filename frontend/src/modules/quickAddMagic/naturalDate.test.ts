import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'

import {extractNaturalDate, normalizeDateText, parseNaturalDate} from './naturalDate'
import {PrefixMode} from './prefixes'
import {parseTaskText} from './quickAddMagic'

// Wednesday 16 September 2026, 10:15
const NOW = new Date(2026, 8, 16, 10, 15)

describe('normalizeDateText', () => {
	it.each([
		['Mañana 10:00', 'tomorrow at 10:00'],
		['pasado mañana', 'in 2 days'],
		['el próximo lunes a las 9', 'next monday at 9:00'],
		['viernes que viene', 'next friday'],
		['el viernes', 'friday'],
		['en 3 días', 'in 3 days'],
		['dentro de una semana', 'in 1 week'],
		['15 de marzo', '15 march'],
		['el 5 a las 18:30', '5th at 18:30'],
		['a las 5 de la tarde', 'at 5:00 pm'],
		['fin de mes', 'end of month'],
		['la semana que viene', 'next week'],
		['hoy 21h', 'today at 21:00'],
		['tomorrow 3pm', 'tomorrow at 3:00pm'],
		['next friday at 10', 'next friday at 10'],
		['in a week', 'in 1 week'],
	])('rewrites "%s" as "%s"', (text, expected) => {
		expect(normalizeDateText(text)).toBe(expected)
	})

	it('turns day-first numeric dates into the parser\'s day.month form', () => {
		expect(normalizeDateText('3/10', {dayFirst: true})).toBe('3.10')
		expect(normalizeDateText('3/10/2027', {dayFirst: true})).toBe('3.10.2027')
		expect(normalizeDateText('3/10')).toBe('3/10')
	})
})

describe('parseNaturalDate', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(NOW)
		setActivePinia(createPinia())
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it.each([
		['mañana 10:00', new Date(2026, 8, 17, 10, 0)],
		['lunes que viene a las 9', new Date(2026, 8, 21, 9, 0)],
		['a las 5 de la tarde', new Date(2026, 8, 16, 17, 0)],
		['10:30', new Date(2026, 8, 16, 10, 30)],
		['tomorrow at 3pm', new Date(2026, 8, 17, 15, 0)],
		['en una hora', new Date(2026, 8, 16, 11, 15)],
	])('reads "%s" with its time', (text, expected) => {
		expect(parseNaturalDate(text, NOW)).toEqual({date: expected, hasTime: true})
	})

	it.each([
		['hoy', new Date(2026, 8, 16)],
		['pasado mañana', new Date(2026, 8, 18)],
		['viernes', new Date(2026, 8, 18)],
		['next friday', new Date(2026, 8, 18)],
		['en 3 días', new Date(2026, 8, 19)],
		['dentro de 2 semanas', new Date(2026, 8, 30)],
		['fin de mes', new Date(2026, 8, 30)],
		['15 de marzo', new Date(2027, 2, 15)],
	])('reads the day of "%s" and leaves the time to the picker', (text, expected) => {
		const result = parseNaturalDate(text, NOW)
		expect(result?.hasTime).toBe(false)
		expect(result?.date.toDateString()).toBe(expected.toDateString())
	})

	it('reads numeric dates day first when asked', () => {
		expect(parseNaturalDate('3/10', NOW, {dayFirst: true})?.date.toDateString()).toBe(new Date(2026, 9, 3).toDateString())
		expect(parseNaturalDate('3/10', NOW)?.date.toDateString()).toBe(new Date(2027, 2, 10).toDateString())
	})

	it('does not move the given now', () => {
		const now = new Date(NOW)
		parseNaturalDate('friday', now)
		expect(now).toEqual(NOW)
	})

	it.each(['', '   ', 'reunión con Ana', 'mar'])('finds no date in "%s"', text => {
		expect(parseNaturalDate(text, NOW)).toBeNull()
	})
})

describe('extractNaturalDate', () => {
	// Some parser paths read the clock instead of the given now.
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(NOW)
		setActivePinia(createPinia())
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('takes a Spanish date phrase off the end of a title', () => {
		const result = extractNaturalDate('Llamar al fontanero mañana a las 10', NOW)
		expect(result?.text).toBe('Llamar al fontanero')
		expect(result?.date).toEqual(new Date(2026, 8, 17, 10, 0))
	})

	it('takes it off the start and keeps the title capitalised', () => {
		const result = extractNaturalDate('Pasado mañana revisar la caldera', NOW)
		expect(result?.text).toBe('Revisar la caldera')
		expect(result?.date?.getDate()).toBe(18)
	})

	it('finds a phrase inside the title', () => {
		const result = extractNaturalDate('Reservar el próximo lunes la cabaña', NOW)
		expect(result?.text).toBe('Reservar la cabaña')
		expect(result?.date?.getDay()).toBe(1)
	})

	it('leaves a title without a date alone', () => {
		expect(extractNaturalDate('Comprar mayonesa y pan', NOW)).toBeNull()
		expect(extractNaturalDate('', NOW)).toBeNull()
	})
})

describe('parseTaskText in Spanish', () => {
	// Some parser paths read the clock instead of the given now.
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(NOW)
		setActivePinia(createPinia())
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('reads the date after the English parser found none, with the other magic intact', () => {
		const parsed = parseTaskText('Llamar al fontanero mañana a las 10 *casa !4', PrefixMode.Default, NOW)
		expect(parsed.text).toBe('Llamar al fontanero')
		expect(parsed.date).toEqual(new Date(2026, 8, 17, 10, 0))
		expect(parsed.labels).toEqual(['casa'])
		expect(parsed.priority).toBe(4)
	})
})
