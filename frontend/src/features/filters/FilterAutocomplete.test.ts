import {describe, it, expect} from 'vitest'
import {Schema} from '@tiptap/pm/model'
import {EditorState, TextSelection, type Transaction} from '@tiptap/pm/state'
import type {EditorView} from '@tiptap/pm/view'

import {
	applyFilterSuggestion,
	calculateReplacementRange,
	createFilterAutocompletePlugin,
	dismissFilterAutocomplete,
	filterAutocompleteKey,
} from './FilterAutocomplete'

describe('FilterAutocomplete', () => {
	describe('calculateReplacementRange', () => {
		// Note: calculateReplacementRange adds +1 to convert string indices to ProseMirror positions
		// In ProseMirror, position 0 is before the document, text starts at position 1

		describe('single value replacement', () => {
			it('should use startPos and endPos for replacement boundaries with +1 offset for ProseMirror', () => {
				const context = {
					keyword: 'Work To Do',
					startPos: 11, // position after "project in "
					endPos: 21,   // position after "Work To Do"
				}

				const result = calculateReplacementRange(context, 'in')

				expect(result.replaceFrom).toBe(12) // 11 + 1 for ProseMirror offset
				expect(result.replaceTo).toBe(22)   // 21 + 1 for ProseMirror offset
				expect(result.replaceTo - result.replaceFrom).toBe(context.keyword.length)
			})

			it('should handle single-word values correctly', () => {
				const context = {
					keyword: 'Inbox',
					startPos: 11,
					endPos: 16,
				}

				const result = calculateReplacementRange(context, 'in')

				expect(result.replaceTo - result.replaceFrom).toBe(5) // "Inbox".length
			})

			it('should handle equals operator', () => {
				const context = {
					keyword: 'MyProject',
					startPos: 10,
					endPos: 19,
				}

				const result = calculateReplacementRange(context, '=')

				expect(result.replaceFrom).toBe(11) // 10 + 1
				expect(result.replaceTo).toBe(20)   // 19 + 1
			})
		})

		describe('multi-value operator replacement', () => {
			it('should only replace text after last comma for multi-value operators', () => {
				const context = {
					keyword: 'Inbox, Work To Do',
					startPos: 11,
					endPos: 28, // 11 + 17
				}

				const result = calculateReplacementRange(context, 'in')

				// lastCommaIndex = 5 (position of comma in "Inbox, Work To Do")
				// textAfterComma = " Work To Do" (11 chars)
				// leadingSpaces = 1
				// replaceFrom = 11 + 5 + 1 + 1 + 1 = 19 (extra +1 for ProseMirror offset)
				expect(result.replaceFrom).toBe(19)
				expect(result.replaceTo).toBe(29) // 28 + 1
			})

			it('should handle multiple commas correctly', () => {
				const context = {
					keyword: 'One, Two, Three',
					startPos: 11,
					endPos: 26,
				}

				const result = calculateReplacementRange(context, 'in')

				// lastCommaIndex = 8 (position of second comma in "One, Two, Three")
				// textAfterComma = " Three" (6 chars)
				// leadingSpaces = 1
				// replaceFrom = 11 + 8 + 1 + 1 + 1 = 22 (extra +1 for ProseMirror offset)
				expect(result.replaceFrom).toBe(22)
				expect(result.replaceTo).toBe(27) // 26 + 1
			})

			it('should handle ?= operator as multi-value', () => {
				const context = {
					keyword: 'Label1, Label2',
					startPos: 10,
					endPos: 24,
				}

				const result = calculateReplacementRange(context, '?=')

				// lastCommaIndex = 6
				// textAfterComma = " Label2" (7 chars)
				// leadingSpaces = 1
				// replaceFrom = 10 + 6 + 1 + 1 + 1 = 19 (extra +1 for ProseMirror offset)
				expect(result.replaceFrom).toBe(19)
				expect(result.replaceTo).toBe(25) // 24 + 1
			})

			it('should handle no spaces after comma', () => {
				const context = {
					keyword: 'A,B,C',
					startPos: 5,
					endPos: 10,
				}

				const result = calculateReplacementRange(context, 'in')

				// lastCommaIndex = 3 (position of second comma)
				// textAfterComma = "C" (1 char)
				// leadingSpaces = 0
				// replaceFrom = 5 + 3 + 1 + 0 + 1 = 10 (extra +1 for ProseMirror offset)
				expect(result.replaceFrom).toBe(10)
				expect(result.replaceTo).toBe(11) // 10 + 1
			})

			it('should not modify range for single values even with in operator', () => {
				const context = {
					keyword: 'SingleProject',
					startPos: 11,
					endPos: 24,
				}

				const result = calculateReplacementRange(context, 'in')

				// No comma in keyword, so full range should be used (with +1 offset)
				expect(result.replaceFrom).toBe(12) // 11 + 1
				expect(result.replaceTo).toBe(25)   // 24 + 1
			})
		})

		describe('non-multi-value operators', () => {
			it('should not modify range for = operator even with commas in value', () => {
				const context = {
					keyword: 'Value, With, Commas',
					startPos: 10,
					endPos: 29,
				}

				const result = calculateReplacementRange(context, '=')

				// = is not a multi-value operator, so full range should be used (with +1 offset)
				expect(result.replaceFrom).toBe(11) // 10 + 1
				expect(result.replaceTo).toBe(30)   // 29 + 1
			})

			it('should not modify range for != operator', () => {
				const context = {
					keyword: 'A, B',
					startPos: 10,
					endPos: 14,
				}

				const result = calculateReplacementRange(context, '!=')

				expect(result.replaceFrom).toBe(11) // 10 + 1
				expect(result.replaceTo).toBe(15)   // 14 + 1
			})
		})

		describe('closing quote handling', () => {
			it('should extend replaceTo by 1 when hasClosingQuote is true', () => {
				const context = {
					keyword: 'Work To Do',
					startPos: 12, // position after opening quote in 'project = "'
					endPos: 22,
				}

				const result = calculateReplacementRange(context, '=', true)

				expect(result.replaceFrom).toBe(13) // 12 + 1
				expect(result.replaceTo).toBe(24)   // 22 + 1 + 1 (extra 1 for closing quote)
			})

			it('should not extend replaceTo when hasClosingQuote is false', () => {
				const context = {
					keyword: 'Work To Do',
					startPos: 12,
					endPos: 22,
				}

				const result = calculateReplacementRange(context, '=', false)

				expect(result.replaceFrom).toBe(13) // 12 + 1
				expect(result.replaceTo).toBe(23)   // 22 + 1 (no extra for closing quote)
			})

			it('should default hasClosingQuote to false when not provided', () => {
				const context = {
					keyword: 'Work To Do',
					startPos: 12,
					endPos: 22,
				}

				const result = calculateReplacementRange(context, '=')

				expect(result.replaceTo).toBe(23) // 22 + 1 (no extra for closing quote)
			})

			it('should handle closing quote with multi-value operators', () => {
				const context = {
					keyword: 'Inbox, Work To Do',
					startPos: 12,
					endPos: 29,
				}

				const result = calculateReplacementRange(context, 'in', true)

				// lastCommaIndex = 5
				// textAfterComma = " Work To Do" (11 chars)
				// leadingSpaces = 1
				// replaceFrom = 12 + 5 + 1 + 1 + 1 = 20
				expect(result.replaceFrom).toBe(20)
				// replaceTo = 29 + 1 + 1 = 31 (extra 1 for closing quote)
				expect(result.replaceTo).toBe(31)
			})
		})
	})
})

const schema = new Schema({
	nodes: {
		doc: {content: 'paragraph'},
		paragraph: {content: 'text*'},
		text: {inline: true},
	},
})

// Enough of a view for the helpers, which only read the state and dispatch.
function createView(text: string, caret = text.length) {
	const plugin = createFilterAutocompletePlugin({onChange: () => {}, onKeyDown: () => false})
	const doc = schema.node('doc', null, [schema.node('paragraph', null, text ? [schema.text(text)] : [])])
	let state = EditorState.create({doc, plugins: [plugin]})
	state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, caret + 1)))
	const view = {
		get state() {
			return state
		},
		dispatch(tr: Transaction) {
			state = state.apply(tr)
		},
	}
	return view as unknown as EditorView & {state: EditorState}
}

function type(view: EditorView, text: string) {
	view.dispatch(view.state.tr.insertText(text))
}

const text = (view: EditorView) => view.state.doc.textContent
const pluginState = (view: EditorView) => filterAutocompleteKey.getState(view.state)!

describe('filter autocomplete plugin', () => {
	it('stays closed for content it starts with', () => {
		const view = createView('labels in urg')
		expect(pluginState(view)).toMatchObject({active: false, context: {search: 'urg'}})
	})

	it('opens while typing a value and follows it', () => {
		const view = createView('done = false && ')
		type(view, 'labels in ur')
		expect(pluginState(view)).toMatchObject({active: true, context: {search: 'ur', kind: 'labels'}})
		type(view, ' ')
		expect(pluginState(view).active).toBe(false)
	})

	it('closes on Escape until the next edit', () => {
		const view = createView('')
		type(view, 'labels in ur')
		dismissFilterAutocomplete(view)
		expect(pluginState(view).active).toBe(false)
		type(view, 'g')
		expect(pluginState(view)).toMatchObject({active: true, context: {search: 'urg'}})
	})

	it('closes when the caret moves to another value', () => {
		const view = createView('')
		type(view, 'labels in a && project = b')
		expect(pluginState(view).active).toBe(true)
		view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 12)))
		expect(pluginState(view)).toMatchObject({active: false, context: {field: 'labels'}})
	})

	it('replaces the value being typed and closes', () => {
		const view = createView('')
		type(view, 'labels in urgent, ho')
		applyFilterSuggestion(view, pluginState(view).context!, 'home')
		expect(text(view)).toBe('labels in urgent, home')
		expect(view.state.selection.from).toBe(text(view).length + 1)
		expect(pluginState(view).active).toBe(false)
	})

	it('keeps the rest of the query after the caret', () => {
		const view = createView('labels = wo && done = false', 'labels = wo'.length)
		type(view, 'r')
		applyFilterSuggestion(view, pluginState(view).context!, 'Work To Do')
		expect(text(view)).toBe('labels = Work To Do && done = false')
	})

	it('quotes values that would end an unquoted value', () => {
		const view = createView('')
		type(view, 'project = ho')
		applyFilterSuggestion(view, pluginState(view).context!, 'Home (old)')
		expect(text(view)).toBe('project = "Home (old)"')
	})

	it('closes the quote the value was opened with', () => {
		const view = createView('project = "Wo" && done = true', 'project = "Wo'.length)
		type(view, 'r')
		applyFilterSuggestion(view, pluginState(view).context!, 'Work To Do')
		expect(text(view)).toBe('project = "Work To Do" && done = true')
		expect(view.state.selection.from).toBe('project = "Work To Do"'.length + 1)
	})
})
