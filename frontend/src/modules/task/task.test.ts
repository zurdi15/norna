import {describe, expect, it} from 'vitest'

import {getTaskColor, getTaskDate, getTaskIdentifier, NO_DATE, normalizeTaskInput, toApiDate} from './task'

describe('getTaskIdentifier', () => {
	it('uses the project identifier when there is one', () => {
		expect(getTaskIdentifier({identifier: 'PROJ-12', index: 12})).toBe('PROJ-12')
	})

	it('falls back to the index for projects without an identifier', () => {
		expect(getTaskIdentifier({identifier: '', index: 7})).toBe('#7')
		expect(getTaskIdentifier({identifier: '-7', index: 7})).toBe('#7')
	})

	it('returns an empty string without a task', () => {
		expect(getTaskIdentifier(null)).toBe('')
		expect(getTaskIdentifier(undefined)).toBe('')
	})
})

describe('getTaskColor', () => {
	it('prefixes the stored hex with #', () => {
		expect(getTaskColor({hex_color: 'e8e8e8'})).toBe('#e8e8e8')
	})

	it('treats an empty color as unset', () => {
		expect(getTaskColor({hex_color: ''})).toBeUndefined()
		expect(getTaskColor({})).toBeUndefined()
	})
})

describe('api dates', () => {
	it('reads the zero time as no date', () => {
		expect(getTaskDate(NO_DATE)).toBeNull()
		expect(getTaskDate('2026-05-01T10:00:00Z')?.toISOString()).toBe('2026-05-01T10:00:00.000Z')
	})

	it('writes a cleared date as the zero time', () => {
		expect(toApiDate(null)).toBe(NO_DATE)
		expect(toApiDate(new Date('2026-05-01T10:00:00Z'))).toBe('2026-05-01T10:00:00.000Z')
	})
})

describe('normalizeTaskInput', () => {
	it('trims the title and strips the # from the color', () => {
		expect(normalizeTaskInput({title: '  Buy milk ', hex_color: '#ff0000'})).toEqual({
			title: 'Buy milk',
			hex_color: 'ff0000',
		})
	})

	it('only returns the fields it was given', () => {
		expect(normalizeTaskInput({done: true})).toEqual({done: true})
	})

	it('serializes dates and clears removed ones with the zero time', () => {
		expect(normalizeTaskInput({
			due_date: new Date('2026-05-01T10:00:00Z'),
			start_date: null,
			end_date: '',
		})).toEqual({
			due_date: '2026-05-01T10:00:00.000Z',
			start_date: NO_DATE,
			end_date: NO_DATE,
		})
	})

	it('keeps relative reminders without a date and serializes absolute ones', () => {
		expect(normalizeTaskInput({
			reminders: [
				{relative_period: -3600, relative_to: 'due_date', reminder: NO_DATE},
				{reminder: '2026-05-01T08:00:00Z', relative_to: ''},
			],
		}).reminders).toEqual([
			{relative_period: -3600, relative_to: 'due_date'},
			{reminder: '2026-05-01T08:00:00.000Z'},
		])
	})
})
