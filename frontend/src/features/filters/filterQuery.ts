import {snakeCase} from 'change-case'

import {AVAILABLE_FILTER_FIELDS, FILTER_OPERATORS} from '@/helpers/filters'

export type AutocompleteKind = 'labels' | 'users' | 'projects'

/**
 * The value being typed at the caret, when it belongs to a field that can be autocompleted.
 * Indexes are into the plain filter text.
 */
export interface AutocompleteContext {
	field: string
	kind: AutocompleteKind
	// Lowercased: 'in', 'not in', '=', '!=' or '?='.
	operator: string
	// The quote the value opened with, '' when unquoted.
	quote: string
	// From the start of the value (after an opening quote) up to the caret.
	keyword: string
	keywordStart: number
	// The part being typed now: after the last comma for list operators.
	search: string
	searchStart: number
	// Values listed before it, for list operators.
	values: string[]
	cursor: number
	hasClosingQuote: boolean
}

const KIND_BY_FIELD: Record<string, AutocompleteKind> = {
	labels: 'labels',
	assignees: 'users',
	createdby: 'users',
	created_by: 'users',
	project: 'projects',
}

const LIST_OPERATORS = ['in', 'not in', '?=']

// `like` takes a pattern and comparisons make no sense for names, so they get no suggestions.
const AUTOCOMPLETE_PATTERN = new RegExp(
	'(?:^|[\\s(&|])(labels|assignees|createdBy|created_by|project)(\\s*)(!=|\\?=|=|not in\\b|in\\b)(\\s*)(["\']?)([^"\'&|()]*)$',
	'i',
)

export function findAutocompleteContext(text: string, cursor: number): AutocompleteContext | null {
	const match = AUTOCOMPLETE_PATTERN.exec(text.slice(0, cursor))
	if (!match) {
		return null
	}
	const [, field = '', spaceBefore = '', rawOperator = '', spaceAfter = '', quote = '', keyword = ''] = match
	const operator = rawOperator.toLowerCase()
	// "labelsin" or "labels inurgent" are not a field and an operator yet.
	if (/^[a-z]/.test(operator) && (spaceBefore === '' || spaceAfter === '')) {
		return null
	}

	const next = text[cursor]
	// Inside a word: the caret is not at the end of the value being typed.
	if (next !== undefined && !/[\s&|(),"']/.test(next)) {
		return null
	}

	const keywordStart = cursor - keyword.length
	const isList = LIST_OPERATORS.includes(operator)
	const lastComma = isList ? keyword.lastIndexOf(',') : -1
	const segment = keyword.slice(lastComma + 1)
	const leading = segment.length - segment.trimStart().length
	const search = segment.trim()

	// A finished value followed by a space: the next thing typed is an operator like &&.
	if (quote === '' && search !== '' && /\s$/.test(segment)) {
		return null
	}

	return {
		field,
		kind: KIND_BY_FIELD[field.toLowerCase()]!,
		operator,
		quote,
		keyword,
		keywordStart,
		search,
		searchStart: keywordStart + lastComma + 1 + leading,
		values: lastComma < 0
			? []
			: keyword.slice(0, lastComma).split(',').map(value => value.trim()).filter(Boolean),
		cursor,
		hasClosingQuote: quote !== '' && next === quote,
	}
}

// Characters that end an unquoted value in the filter grammar.
export function needsQuotes(value: string): boolean {
	return /[&|()<]/.test(value)
}

type Join = '&&' | '||'

// Splits at && and || outside of quotes and parentheses.
function splitTopLevel(filter: string): {terms: string[], joins: Join[]} {
	const terms: string[] = []
	const joins: Join[] = []
	let depth = 0
	let quote = ''
	let start = 0
	for (let index = 0; index < filter.length; index++) {
		const char = filter[index]!
		if (quote !== '') {
			if (char === '\\') {
				index++
			} else if (char === quote) {
				quote = ''
			}
			continue
		}
		if (char === '"' || char === '\'') {
			quote = char
		} else if (char === '(') {
			depth++
		} else if (char === ')') {
			depth = Math.max(0, depth - 1)
		} else if (depth === 0 && (filter.startsWith('&&', index) || filter.startsWith('||', index))) {
			terms.push(filter.slice(start, index).trim())
			joins.push(filter.slice(index, index + 2) as Join)
			index++
			start = index + 1
		}
	}
	terms.push(filter.slice(start).trim())
	return {terms, joins}
}

// "(a && b)" but not "(a) && (b)": the opening parenthesis closes at the very end.
function isWrapped(term: string): boolean {
	if (!term.startsWith('(') || !term.endsWith(')')) {
		return false
	}
	let depth = 0
	for (let index = 0; index < term.length; index++) {
		if (term[index] === '(') {
			depth++
		} else if (term[index] === ')') {
			depth--
			if (depth === 0 && index < term.length - 1) {
				return false
			}
		}
	}
	return true
}

function unwrap(term: string): string {
	let inner = term
	while (isWrapped(inner)) {
		inner = inner.slice(1, -1).trim()
	}
	return inner
}

const isDoneFalse = (term: string) => /^done\s*(?:=\s*false|!=\s*true)$/i.test(unwrap(term))
const isDoneCondition = (term: string) => /^done\s*(?:[!=<>?]|(?:not\s+in|in|like)\b)/i.test(unwrap(term))

/**
 * Whether the filter keeps done tasks out: a `done = false` that every other condition is
 * joined to with &&. Inside an || it only narrows one branch, so it doesn't count.
 */
export function hidesDoneTasks(filter: string): boolean {
	const {terms, joins} = splitTopLevel(filter)
	if (joins.includes('||')) {
		return false
	}
	return terms.some(term => isDoneFalse(term) || (isWrapped(term) && hidesDoneTasks(unwrap(term))))
}

// Drops the matching conditions from an && chain, including nested groups. An || chain is left alone.
function removeConditions(filter: string, matches: (term: string) => boolean): string {
	const {terms, joins} = splitTopLevel(filter)
	if (joins.includes('||')) {
		return filter
	}
	let changed = false
	const kept = terms.flatMap(term => {
		if (matches(term)) {
			changed = true
			return []
		}
		if (!isWrapped(term)) {
			return [term]
		}
		const inner = unwrap(term)
		const rest = removeConditions(inner, matches)
		if (rest === inner) {
			return [term]
		}
		changed = true
		if (rest === '') {
			return []
		}
		return [splitTopLevel(rest).joins.length > 0 ? `(${rest})` : rest]
	})
	return changed ? kept.join(' && ') : filter
}

/**
 * The "show done tasks" switch: removes `done = false`, or puts it in front of the rest.
 * Other conditions on `done` (such as `done = true`) give way when hiding done tasks.
 */
export function setShowDoneTasks(filter: string, show: boolean): string {
	const trimmed = filter.trim()
	if (show) {
		return hidesDoneTasks(trimmed) ? removeConditions(trimmed, isDoneFalse) : trimmed
	}
	if (hidesDoneTasks(trimmed)) {
		return trimmed
	}
	const rest = removeConditions(trimmed, isDoneCondition)
	if (rest === '') {
		return 'done = false'
	}
	return splitTopLevel(rest).joins.includes('||')
		? `done = false && (${rest})`
		: `done = false && ${rest}`
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const CONDITION_PATTERN = new RegExp(
	`\\b(?:${[...new Set(AVAILABLE_FILTER_FIELDS.flatMap(field => [field, snakeCase(field)]))].join('|')})\\s*(?:${
		[...FILTER_OPERATORS]
			.sort((a, b) => b.length - a.length)
			.map(operator => /^[a-z]/i.test(operator) ? `${escapeRegex(operator)}\\b` : escapeRegex(operator))
			.join('|')
	})`,
	'gi',
)

// Field-operator pairs in a filter, in either format. Quoted values don't count.
export function countFilterConditions(filter: string): number {
	const unquoted = filter.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, '""')
	return unquoted.match(CONDITION_PATTERN)?.length ?? 0
}

/**
 * Inserts a token at the caret with a space on either side where the text needs one,
 * e.g. "done" after "false" becomes " done ". Returns the text to insert.
 */
export function spaceToken(before: string, after: string, token: string): string {
	const opensGroup = token === '('
	const closesGroup = token === ')'
	const lead = before !== '' && !/[\s(]$/.test(before) && !closesGroup ? ' ' : ''
	const trail = opensGroup || /^\s/.test(after) ? '' : ' '
	return `${lead}${token}${trail}`
}
