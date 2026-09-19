import {describe, expect, it} from 'vitest'

import {columnExample, dateFormatOptions, parseCsvRows, readCsvHead, remapColumns} from './csv'
import {availableMigrators, failureKey, getMigrator, migratorRoute, oauthCode} from './migrators'

describe('migrators', () => {
	it('keeps the server order and drops what this app does not know', () => {
		expect(availableMigrators(['csv', 'wunderlist', 'todoist', 'constructor']).map(migrator => migrator.id)).toEqual(['csv', 'todoist'])
		expect(getMigrator('toString')).toBeUndefined()
	})

	it('sends csv to its own page', () => {
		expect(migratorRoute(getMigrator('csv')!)).toEqual({name: 'migrate.csv'})
		expect(migratorRoute(getMigrator('planka')!)).toEqual({name: 'migrate.service', params: {service: 'planka'}})
	})

	it('explains a failure by its kind, with the detail only when there is one', () => {
		expect(failureKey({errorKind: 'credentials', errorMessage: ''})).toBe('migration.failure.credentials')
		expect(failureKey({errorKind: 'detail', errorMessage: 'bad date in row 3'})).toBe('migration.failure.detail')
		expect(failureKey({errorKind: 'detail', errorMessage: ''})).toBe('migration.failure.reported')
		expect(failureKey({errorKind: 'from-the-future', errorMessage: ''})).toBe('migration.failure.reported')
	})

	it('takes the code from the query, or trello\'s token from the hash', () => {
		expect(oauthCode('abc', '')).toBe('abc')
		expect(oauthCode(undefined, '#token=xyz')).toBe('xyz')
		expect(oauthCode(undefined, '#other')).toBe('')
	})
})

describe('csv helpers', () => {
	it('splits rows, honoring quotes, doubled quotes and newlines inside them', () => {
		expect(parseCsvRows('﻿Name;Note\r\n"Buy; milk";"say ""hi""\nthen go"\nLast;', ';', '"', 10)).toEqual([
			['Name', 'Note'],
			['Buy; milk', 'say "hi"\nthen go'],
			['Last', ''],
		])
		expect(parseCsvRows('a,b\nc,d\ne,f\n', ',', '"', 2)).toEqual([['a', 'b'], ['c', 'd']])
	})

	it('reads the header and the first rows of a file', async () => {
		const file = new Blob(['Title|Due\nMilk|2026-01-02\n'])
		expect(await readCsvHead(file, '|', '"')).toEqual({columns: ['Title', 'Due'], rows: [['Milk', '2026-01-02']]})
	})

	it('keeps a mapping by column name when the columns change', () => {
		expect(remapColumns(['Title', 'Due', 'Tags'], [
			{column_index: 0, column_name: 'Title;Due;Tags', attribute: 'title'},
			{column_index: 5, column_name: 'Due', attribute: 'due_date'},
		])).toEqual([
			{column_index: 0, column_name: 'Title', attribute: 'ignore'},
			{column_index: 1, column_name: 'Due', attribute: 'due_date'},
			{column_index: 2, column_name: 'Tags', attribute: 'ignore'},
		])
	})

	it('finds the first value of a column', () => {
		expect(columnExample([['a', ''], ['b', ' x ']], 1)).toBe('x')
		expect(columnExample([['a']], 3)).toBe('')
	})

	it('offers the detected date format even when it is unusual', () => {
		expect(dateFormatOptions('2006-01-02')[0]).toEqual({value: '2006-01-02', label: 'YYYY-MM-DD'})
		expect(dateFormatOptions('2006-01-02T15:04:05Z07:00')[0]).toEqual({value: '2006-01-02T15:04:05Z07:00', label: '2006-01-02T15:04:05Z07:00'})
	})
})
