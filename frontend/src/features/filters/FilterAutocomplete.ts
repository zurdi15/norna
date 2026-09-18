import {Extension} from '@tiptap/core'
import {Plugin, PluginKey, TextSelection, type EditorState} from '@tiptap/pm/state'
import type {EditorView} from '@tiptap/pm/view'

import {isMultiValueOperator} from '@/helpers/filters'

import {findAutocompleteContext, needsQuotes, type AutocompleteContext} from './filterQuery'

export type {AutocompleteContext, AutocompleteKind} from './filterQuery'

/**
 * Calculates the replacement range for autocomplete selection.
 * For single-value operators: replaces the entire keyword
 * For multi-value operators with commas: only replaces the text after the last comma
 * When inside quotes, extends the range to include the closing quote
 *
 * @param context - The autocomplete context containing position and keyword info
 * @param operator - The filter operator (e.g., 'in', '=', '?=')
 * @param hasClosingQuote - Whether there's a closing quote to include in replacement
 * @returns Object with replaceFrom and replaceTo positions
 */
export function calculateReplacementRange(
	context: { startPos: number; endPos: number; keyword: string },
	operator: string,
	hasClosingQuote: boolean = false,
): { replaceFrom: number; replaceTo: number } {
	// Add 1 to convert from string indices to ProseMirror positions
	// In ProseMirror, position 0 is before the document, text starts at position 1
	let replaceFrom = context.startPos + 1
	let replaceTo = context.endPos + 1

	// Handle multi-value operators - only replace the last value after comma
	if (isMultiValueOperator(operator) && context.keyword.includes(',')) {
		const lastCommaIndex = context.keyword.lastIndexOf(',')
		const textAfterComma = context.keyword.substring(lastCommaIndex + 1)
		const leadingSpaces = textAfterComma.length - textAfterComma.trimStart().length
		replaceFrom = context.startPos + lastCommaIndex + 1 + leadingSpaces + 1
	}

	// Extend range to include closing quote if present
	if (hasClosingQuote) {
		replaceTo += 1
	}

	return { replaceFrom, replaceTo }
}

export interface FilterAutocompleteState {
	context: AutocompleteContext | null
	// Suggestions show while typing a value. Picking one, Escape, or content set from outside
	// closes them until the next edit.
	active: boolean
}

export const filterAutocompleteKey = new PluginKey<FilterAutocompleteState>('filterAutocomplete')

// The filter input's document is a single paragraph, so text index i sits at position i + 1.
function contextAt(state: EditorState): AutocompleteContext | null {
	const {selection, doc} = state
	return selection.empty ? findAutocompleteContext(doc.textContent, selection.from - 1) : null
}

function sameValue(a: AutocompleteContext | null, b: AutocompleteContext | null): boolean {
	return a !== null && b !== null && a.keywordStart === b.keywordStart && a.field === b.field
}

function sameContext(a: AutocompleteContext | null, b: AutocompleteContext | null): boolean {
	return a === b || (sameValue(a, b) && a!.cursor === b!.cursor && a!.keyword === b!.keyword)
}

export interface FilterAutocompleteOptions {
	// The value being typed whenever it changes; null when there is nothing to suggest.
	onChange: (context: AutocompleteContext | null) => void
	// Keys pressed while a value is being typed; return true to stop the editor handling them.
	onKeyDown: (event: KeyboardEvent) => boolean
}

export function createFilterAutocompletePlugin(options: FilterAutocompleteOptions) {
	let reported: AutocompleteContext | null = null

	function report(state: FilterAutocompleteState | undefined) {
		const next = state?.active ? state.context : null
		if (sameContext(next, reported)) {
			return
		}
		reported = next
		options.onChange(next)
	}

	return new Plugin<FilterAutocompleteState>({
		key: filterAutocompleteKey,
		state: {
			init: (_, state) => ({context: contextAt(state), active: false}),
			apply(tr, previous, _oldState, newState) {
				const context = contextAt(newState)
				if (context === null || tr.getMeta(filterAutocompleteKey)?.dismiss) {
					return {context, active: false}
				}
				if (tr.docChanged) {
					return {context, active: true}
				}
				// Moving the caret within the same value keeps the list; elsewhere it waits for typing.
				return {context, active: previous.active && sameValue(previous.context, context)}
			},
		},
		view: () => ({
			update: view => report(filterAutocompleteKey.getState(view.state)),
			destroy: () => report(undefined),
		}),
		props: {
			handleKeyDown(view, event) {
				return filterAutocompleteKey.getState(view.state)?.active === true && options.onKeyDown(event)
			},
		},
	})
}

export function dismissFilterAutocomplete(view: EditorView) {
	view.dispatch(view.state.tr.setMeta(filterAutocompleteKey, {dismiss: true}))
}

/**
 * Replaces the value being typed with a suggestion and leaves the caret after it.
 * Values that would end an unquoted value (a parenthesis, &, |) get quoted.
 */
export function applyFilterSuggestion(view: EditorView, context: AutocompleteContext, value: string) {
	const {replaceFrom, replaceTo} = calculateReplacementRange(
		{startPos: context.keywordStart, endPos: context.cursor, keyword: context.keyword},
		context.operator,
		context.hasClosingQuote,
	)
	const text = context.quote !== ''
		? `${value}${context.quote}`
		: needsQuotes(value) ? `"${value}"` : value
	const tr = view.state.tr.insertText(text, replaceFrom, replaceTo)
	tr.setSelection(TextSelection.create(tr.doc, replaceFrom + text.length))
	tr.setMeta(filterAutocompleteKey, {dismiss: true})
	view.dispatch(tr)
}

// Runs before the input's own keymap, so Enter picks a suggestion instead of submitting.
export const FilterAutocomplete = Extension.create<FilterAutocompleteOptions>({
	name: 'filterAutocomplete',
	priority: 200,

	addOptions() {
		return {
			onChange: () => {},
			onKeyDown: () => false,
		}
	},

	addProseMirrorPlugins() {
		return [createFilterAutocompletePlugin(this.options)]
	},
})

export default FilterAutocomplete
