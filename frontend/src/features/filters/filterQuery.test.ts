import {describe, expect, it} from 'vitest'

import {
	countFilterConditions,
	findAutocompleteContext,
	hidesDoneTasks,
	needsQuotes,
	setShowDoneTasks,
	spaceToken,
} from './filterQuery'

// The caret goes where the pipe is.
function contextAt(textWithCaret: string) {
	const cursor = textWithCaret.indexOf('|')
	return findAutocompleteContext(textWithCaret.replace('|', ''), cursor)
}

describe('findAutocompleteContext', () => {
	it('finds the label being typed', () => {
		expect(contextAt('done = false && labels in urg|')).toMatchObject({
			field: 'labels',
			kind: 'labels',
			operator: 'in',
			keyword: 'urg',
			keywordStart: 26,
			search: 'urg',
			searchStart: 26,
			values: [],
		})
	})

	it('maps people and project fields to their kind', () => {
		expect(contextAt('assignees in zu|')?.kind).toBe('users')
		expect(contextAt('createdBy = zu|')?.kind).toBe('users')
		expect(contextAt('project = Ca|')?.kind).toBe('projects')
	})

	it('opens right after the operator with an empty search', () => {
		expect(contextAt('labels in |')).toMatchObject({search: '', searchStart: 10})
		expect(contextAt('labels=|')).toMatchObject({search: '', operator: '='})
	})

	it('waits for the space after a word operator', () => {
		expect(contextAt('labels in|')).toBeNull()
		expect(contextAt('labels not in|')).toBeNull()
	})

	it('only completes the last value of a list', () => {
		expect(contextAt('labels in urgent, ho|')).toMatchObject({
			keyword: 'urgent, ho',
			search: 'ho',
			searchStart: 18,
			values: ['urgent'],
		})
		expect(contextAt('labels not in a,b,|')).toMatchObject({
			operator: 'not in',
			search: '',
			values: ['a', 'b'],
		})
	})

	it('treats commas as part of the value for single-value operators', () => {
		expect(contextAt('labels = a, b|')).toMatchObject({search: 'a, b', values: []})
	})

	it('closes once a finished value is followed by a space', () => {
		expect(contextAt('labels in urgent |')).toBeNull()
		expect(contextAt('labels in urgent && |')).toBeNull()
	})

	it('keeps spaces inside quoted values', () => {
		expect(contextAt('project = "Work To |"')).toMatchObject({
			quote: '"',
			search: 'Work To',
			keywordStart: 11,
			hasClosingQuote: true,
		})
	})

	it('stays closed with the caret in the middle of a word', () => {
		expect(contextAt('labels in urg|ent')).toBeNull()
		expect(contextAt('labels in urg| && done = true')).toMatchObject({search: 'urg'})
	})

	it('ignores fields without suggestions and pattern operators', () => {
		expect(contextAt('priority = |')).toBeNull()
		expect(contextAt('labels like urg|')).toBeNull()
		expect(contextAt('mylabels in urg|')).toBeNull()
	})

	it('matches field names in any case', () => {
		expect(contextAt('Labels IN ur|')).toMatchObject({field: 'Labels', operator: 'in', kind: 'labels'})
	})
})

describe('hidesDoneTasks', () => {
	it.each([
		['done = false', true],
		['done=false', true],
		['done != true', true],
		['labels in 1 && done = false', true],
		['(done = false && priority > 2)', true],
		['priority > 2 && (done = false)', true],
		['', false],
		['done = true', false],
		['labels in 1', false],
		['done = false || priority > 2', false],
		['(done = false || priority > 2) && labels in 1', false],
		['title like "done = false"', false],
	])('%s → %s', (filter, expected) => {
		expect(hidesDoneTasks(filter)).toBe(expected)
	})
})

describe('setShowDoneTasks', () => {
	it('adds done = false in front of the filter', () => {
		expect(setShowDoneTasks('', false)).toBe('done = false')
		expect(setShowDoneTasks('labels in urgent', false)).toBe('done = false && labels in urgent')
	})

	it('groups an || chain before adding the condition', () => {
		expect(setShowDoneTasks('priority >= 4 || labels in urgent', false))
			.toBe('done = false && (priority >= 4 || labels in urgent)')
	})

	it('replaces other conditions on done when hiding done tasks', () => {
		expect(setShowDoneTasks('done = true && priority > 2', false)).toBe('done = false && priority > 2')
	})

	it('removes done = false and the && that joined it', () => {
		expect(setShowDoneTasks('done = false', true)).toBe('')
		expect(setShowDoneTasks('done = false && labels in urgent', true)).toBe('labels in urgent')
		expect(setShowDoneTasks('labels in urgent && done=false && priority > 2', true))
			.toBe('labels in urgent && priority > 2')
	})

	it('removes it from a group joined with &&', () => {
		expect(setShowDoneTasks('(done = false && priority > 2) && labels in 1', true))
			.toBe('priority > 2 && labels in 1')
		expect(setShowDoneTasks('(done = false && (a = 1 || b = 2))', true)).toBe('(a = 1 || b = 2)')
	})

	it('leaves the filter alone when nothing changes', () => {
		expect(setShowDoneTasks('labels in urgent', true)).toBe('labels in urgent')
		expect(setShowDoneTasks('done = false  &&  labels in 1', false)).toBe('done = false  &&  labels in 1')
		expect(setShowDoneTasks('done = false || labels in 1', true)).toBe('done = false || labels in 1')
	})

	it('does not split inside quoted values', () => {
		expect(setShowDoneTasks('project = "A && B" && done = false', true)).toBe('project = "A && B"')
	})

	it('round-trips', () => {
		const filter = 'labels in urgent, home && dueDate < now+7d'
		expect(setShowDoneTasks(setShowDoneTasks(filter, false), true)).toBe(filter)
	})
})

describe('countFilterConditions', () => {
	it.each([
		['', 0],
		['done = false', 1],
		['done = false && labels in 1, 2 && due_date < now+7d', 3],
		['dueDate < dueDate', 1],
		['(priority >= 3 || percentDone > 50) && createdBy = zurdi', 3],
		['project = "done = false"', 1],
		['assignees not in a && doneAt > now', 2],
	])('%s → %i', (filter, expected) => {
		expect(countFilterConditions(filter)).toBe(expected)
	})
})

describe('needsQuotes', () => {
	it('quotes values with characters that end an unquoted value', () => {
		expect(needsQuotes('Work To Do')).toBe(false)
		expect(needsQuotes('R&D')).toBe(true)
		expect(needsQuotes('Home (old)')).toBe(true)
	})
})

describe('spaceToken', () => {
	it('adds the spaces the grammar needs', () => {
		expect(spaceToken('', '', 'done')).toBe('done ')
		expect(spaceToken('done = false', '', '&&')).toBe(' && ')
		expect(spaceToken('done = false ', '', '&&')).toBe('&& ')
		expect(spaceToken('a && ', ' b', 'labels')).toBe('labels')
		expect(spaceToken('a && ', '', '(')).toBe('(')
		expect(spaceToken('(a = 1', '', ')')).toBe(') ')
	})
})
