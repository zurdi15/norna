import {describe, expect, it} from 'vitest'

import {defaultVisibleColumns, nextSort} from './columns'

describe('nextSort', () => {
	it('cycles a column through descending, ascending and off', () => {
		expect(nextSort({}, 'due_date', false)).toEqual({due_date: 'desc'})
		expect(nextSort({due_date: 'desc'}, 'due_date', false)).toEqual({due_date: 'asc'})
		expect(nextSort({due_date: 'asc'}, 'due_date', false)).toEqual({})
	})

	it('replaces the sort unless the column is added with a modifier', () => {
		expect(nextSort({priority: 'desc'}, 'due_date', false)).toEqual({due_date: 'desc'})
		expect(nextSort({priority: 'desc'}, 'due_date', true)).toEqual({priority: 'desc', due_date: 'desc'})
	})
})

describe('defaultVisibleColumns', () => {
	it('always includes the title', () => {
		expect(defaultVisibleColumns()).toContain('title')
	})
})
