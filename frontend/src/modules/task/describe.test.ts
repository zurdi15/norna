import {describe, expect, it} from 'vitest'
import {createI18n} from 'vue-i18n'

import en from '@/i18n/lang/en.json'
import es from '@/i18n/lang/es-ES.json'
import {SECONDS_A_DAY, SECONDS_A_HOUR, SECONDS_A_MINUTE, SECONDS_A_MONTH, SECONDS_A_WEEK, SECONDS_A_YEAR} from '@/constants/date'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'

import {
	describeReminder,
	describeReminderPeriod,
	describeRepeat,
	formatScheduleDate,
	readRepeat,
	repeatIntervalFromSeconds,
	resolveReminderDate,
	type Translate,
} from './describe'
import {NO_DATE} from './task'

function translator(locale: 'en' | 'es-ES'): Translate {
	const i18n = createI18n({legacy: false, locale, fallbackLocale: 'en', messages: {en, 'es-ES': es}})
	return i18n.global.t as unknown as Translate
}

const tEn = translator('en')
const tEs = translator('es-ES')

const now = new Date(2026, 8, 18, 10, 0)
const due = new Date(2026, 8, 19, 10, 0)

describe('resolveReminderDate', () => {
	it('offsets relative reminders from the date they point at', () => {
		const reminder = {relative_to: 'due_date', relative_period: -SECONDS_A_HOUR}
		expect(resolveReminderDate(reminder, {due_date: due})).toEqual(new Date(2026, 8, 19, 9, 0))
		expect(resolveReminderDate(reminder, {due_date: due.toISOString()})).toEqual(new Date(2026, 8, 19, 9, 0))
	})

	it('has no date when the referenced one is missing or the zero time', () => {
		const reminder = {relative_to: 'start_date', relative_period: 0}
		expect(resolveReminderDate(reminder, {due_date: due})).toBeNull()
		expect(resolveReminderDate(reminder, {start_date: NO_DATE})).toBeNull()
	})

	it('ignores the api-resolved date of a relative reminder', () => {
		const reminder = {relative_to: 'due_date', relative_period: 0, reminder: '2020-01-01T00:00:00Z'}
		expect(resolveReminderDate(reminder, {due_date: due})).toEqual(due)
	})

	it('reads absolute reminders', () => {
		expect(resolveReminderDate({reminder: due.toISOString()}, {})).toEqual(due)
		expect(resolveReminderDate({reminder: NO_DATE}, {})).toBeNull()
	})
})

describe('describeReminderPeriod', () => {
	it.each([
		[0, 'due_date', 'Al vencimiento'],
		[-15 * SECONDS_A_MINUTE, 'due_date', '15 min antes del vencimiento'],
		[-SECONDS_A_HOUR, 'due_date', '1 h antes del vencimiento'],
		[-SECONDS_A_DAY, 'start_date', '1 día antes del inicio'],
		[-3 * SECONDS_A_DAY, 'due_date', '3 días antes del vencimiento'],
		[-2 * SECONDS_A_WEEK, 'end_date', '2 semanas antes del final'],
		[2 * SECONDS_A_HOUR, 'due_date', '2 h después del vencimiento'],
	] as const)('describes %i seconds relative to %s in Spanish', (seconds, relativeTo, text) => {
		expect(describeReminderPeriod(seconds, relativeTo, tEs)).toBe(text)
	})

	it('describes in English', () => {
		expect(describeReminderPeriod(-SECONDS_A_DAY, 'due_date', tEn)).toBe('1 day before due date')
		expect(describeReminderPeriod(0, 'start_date', tEn)).toBe('At start time')
	})

	it('drops the reference in the short form', () => {
		expect(describeReminderPeriod(-SECONDS_A_HOUR, 'due_date', tEs, true)).toBe('1 h antes')
		expect(describeReminderPeriod(0, 'due_date', tEn, true)).toBe('At the time')
	})
})

describe('describeReminder', () => {
	const options = {locale: 'es-ES', hour12: false}

	it('describes relative reminders and marks the ones without their date', () => {
		const reminder = {relative_to: 'due_date', relative_period: -SECONDS_A_HOUR}
		expect(describeReminder(reminder, {due_date: due}, tEs, now, options)).toBe('1 h antes del vencimiento')
		expect(describeReminder(reminder, {due_date: NO_DATE}, tEs, now, options)).toBe('1 h antes del vencimiento · sin fecha')
	})

	it('shows the date and time of absolute reminders', () => {
		expect(describeReminder({reminder: due.toISOString()}, {}, tEs, now, options)).toBe('mañana · 10:00')
		expect(describeReminder({reminder: new Date(2026, 8, 25, 18, 30).toISOString()}, {}, tEs, now, options))
			.toBe('vie 25 sept · 18:30')
		expect(describeReminder({reminder: new Date(2026, 8, 25, 18, 30).toISOString()}, {}, tEn, now, {locale: 'en', hour12: true}))
			.toMatch(/^Fri Sep 25 · 6:30\sPM$/)
	})

	it('is empty for an absolute reminder without a date', () => {
		expect(describeReminder({reminder: NO_DATE}, {}, tEs, now, options)).toBe('')
	})
})

describe('formatScheduleDate', () => {
	it('names the nearby days and adds the year only when it differs', () => {
		const options = {locale: 'es-ES', hour12: false}
		expect(formatScheduleDate(new Date(2026, 8, 18, 21, 0), now, options)).toBe('hoy · 21:00')
		expect(formatScheduleDate(new Date(2026, 8, 17, 9, 0), now, options)).toBe('ayer · 09:00')
		expect(formatScheduleDate(new Date(2027, 0, 4, 9, 0), now, options)).toBe('lun 4 ene 2027 · 09:00')
	})
})

describe('repeatIntervalFromSeconds', () => {
	it.each([
		[SECONDS_A_YEAR, 'years', 1],
		[2 * SECONDS_A_MONTH, 'months', 2],
		[SECONDS_A_MONTH, 'months', 1],
		[2 * SECONDS_A_WEEK, 'weeks', 2],
		[3 * SECONDS_A_DAY, 'days', 3],
		[6 * SECONDS_A_HOUR, 'hours', 6],
		[90 * SECONDS_A_MINUTE, 'minutes', 90],
		[45, 'seconds', 45],
	] as const)('reads %i seconds as %s', (seconds, type, amount) => {
		expect(repeatIntervalFromSeconds(seconds)).toEqual({type, amount})
	})
})

describe('readRepeat', () => {
	it('treats the monthly mode as every month whatever repeat_after holds', () => {
		expect(readRepeat(0, TASK_REPEAT_MODES.REPEAT_MODE_MONTH)).toEqual({interval: {type: 'months', amount: 1}, fromCompletion: false})
	})

	it('has no interval without repeat_after', () => {
		expect(readRepeat(0, TASK_REPEAT_MODES.REPEAT_MODE_FROM_CURRENT_DATE)).toEqual({interval: null, fromCompletion: false})
		expect(readRepeat(undefined, undefined)).toEqual({interval: null, fromCompletion: false})
	})

	it('flags the from-completion mode', () => {
		expect(readRepeat(SECONDS_A_WEEK, TASK_REPEAT_MODES.REPEAT_MODE_FROM_CURRENT_DATE))
			.toEqual({interval: {type: 'weeks', amount: 1}, fromCompletion: true})
	})
})

describe('describeRepeat', () => {
	it.each([
		[0, 0, 'No se repite'],
		[SECONDS_A_DAY, 0, 'Cada día'],
		[2 * SECONDS_A_WEEK, 0, 'Cada 2 semanas'],
		[SECONDS_A_MONTH, 1, 'Cada mes'],
		[0, 1, 'Cada mes'],
		[3 * SECONDS_A_MONTH, 0, 'Cada 3 meses'],
		[SECONDS_A_YEAR, 0, 'Cada año'],
		[4 * SECONDS_A_HOUR, 0, 'Cada 4 horas'],
		[SECONDS_A_MONTH, 2, 'Cada mes · desde que se completa'],
	])('describes repeat_after %i with mode %i in Spanish', (repeatAfter, mode, text) => {
		expect(describeRepeat(repeatAfter, mode, tEs)).toBe(text)
	})

	it('describes in English', () => {
		expect(describeRepeat(SECONDS_A_WEEK, 0, tEn)).toBe('Every week')
		expect(describeRepeat(3 * SECONDS_A_DAY, 2, tEn)).toBe('Every 3 days · from completion')
		expect(describeRepeat(0, 0, tEn)).toBe('Doesn\'t repeat')
	})
})
