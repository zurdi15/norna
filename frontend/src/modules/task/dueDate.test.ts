import {describe, expect, it} from 'vitest'

import {dueState, formatLongDate, formatTaskDate, formatTaskDateTime, isoWeek} from './dueDate'

// Friday 18 September 2026, 10:00.
const NOW = new Date(2026, 8, 18, 10, 0)
const ES = {locale: 'es-ES', hour12: false}
const EN = {locale: 'en', hour12: true}

describe('dueState', () => {
	it('is overdue once the moment has passed, even earlier today', () => {
		expect(dueState(new Date(2026, 8, 18, 9, 0), NOW)).toBe('overdue')
		expect(dueState(new Date(2026, 8, 17, 18, 0), NOW)).toBe('overdue')
	})

	it('is today for a later moment of the same day', () => {
		expect(dueState(new Date(2026, 8, 18, 18, 0), NOW)).toBe('today')
	})

	it('is future from tomorrow on', () => {
		expect(dueState(new Date(2026, 8, 19, 0, 0), NOW)).toBe('future')
	})
})

describe('formatTaskDate', () => {
	it('names the days around today, with the time when it has one', () => {
		expect(formatTaskDate(new Date(2026, 8, 18, 18, 0), NOW, ES)).toBe('hoy 18:00')
		expect(formatTaskDate(new Date(2026, 8, 19, 0, 0), NOW, ES)).toBe('mañana')
		expect(formatTaskDate(new Date(2026, 8, 17, 0, 0), NOW, ES)).toBe('ayer')
		expect(formatTaskDate(new Date(2026, 8, 18, 18, 0), NOW, EN)).toBe('today 6:00 PM')
	})

	it('uses the weekday within a week, weekday first in both languages', () => {
		expect(formatTaskDate(new Date(2026, 8, 21, 18, 0), NOW, ES)).toBe('lun 21')
		expect(formatTaskDate(new Date(2026, 8, 21, 18, 0), NOW, EN)).toBe('Mon 21')
		expect(formatTaskDate(new Date(2026, 8, 14, 9, 0), NOW, ES)).toBe('lun 14')
	})

	it('falls back to day and month, and adds the year outside the current one', () => {
		expect(formatTaskDate(new Date(2026, 9, 2), NOW, EN)).toBe('Oct 2')
		expect(formatTaskDate(new Date(2027, 0, 5), NOW, EN)).toBe('Jan 5, 2027')
	})
})

describe('formatLongDate', () => {
	it('spells out the weekday and month, with the year only when it differs', () => {
		expect(formatLongDate(new Date(2026, 8, 21), NOW, ES)).toBe('lunes, 21 de septiembre')
		expect(formatLongDate(new Date(2027, 0, 5), NOW, EN)).toBe('Tuesday, January 5, 2027')
	})
})

describe('isoWeek', () => {
	it('numbers weeks from the one holding the first Thursday', () => {
		expect(isoWeek(NOW)).toBe(38)
		expect(isoWeek(new Date(2027, 0, 1))).toBe(53)
		expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
		expect(isoWeek(new Date(2024, 11, 30))).toBe(1)
	})
})

describe('formatTaskDateTime', () => {
	it('adds the time to dates away from today, unless it is midnight', () => {
		expect(formatTaskDateTime(new Date(2026, 8, 21, 18, 0), NOW, ES)).toBe('lun 21 · 18:00')
		expect(formatTaskDateTime(new Date(2026, 8, 21), NOW, ES)).toBe('lun 21')
		expect(formatTaskDateTime(new Date(2026, 8, 18, 18, 0), NOW, ES)).toBe('hoy 18:00')
	})
})
