import type {ParsedTaskText, Prefixes} from './types'

export type MagicKind = 'label' | 'project' | 'priority' | 'assignee' | 'date'

export interface MagicSegment {
	text: string
	kind: MagicKind | null
}

// Indexes of the words of `a` that survive, in order, in `b` (longest common subsequence).
function survivingWords(a: string[], b: string[]): Set<number> {
	const table = Array.from({length: a.length + 1}, () => new Array<number>(b.length + 1).fill(0))
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
		}
	}
	const kept = new Set<number>()
	let i = 0
	let j = 0
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			kept.add(i)
			i++
			j++
		} else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
			i++
		} else {
			j++
		}
	}
	return kept
}

function prefixKind(word: string, prefixes: Prefixes): MagicKind | null {
	if (word.startsWith(prefixes.label)) return 'label'
	if (word.startsWith(prefixes.project)) return 'project'
	if (word.startsWith(prefixes.priority)) return 'priority'
	return null
}

/**
 * Splits quick add text into plain runs and the parts the magic understood, for
 * highlighting them in place. What the parser took out of the title is magic; its
 * prefix says which kind, and prefix-less words are the date or the repeat. Assignees
 * stay in the title until a user matches, so they're recognised by name instead.
 */
export function highlightMagic(text: string, parsed: ParsedTaskText, prefixes: Prefixes | undefined): MagicSegment[] {
	if (!prefixes || text === '') {
		return text === '' ? [] : [{text, kind: null}]
	}
	// Alternating words and whitespace; empty strings at the edges are dropped later.
	const tokens = text.split(/(\s+)/)
	const wordIndexes = tokens.flatMap((token, index) => index % 2 === 0 && token !== '' ? [index] : [])
	const words = wordIndexes.map(index => tokens[index]!)
	const kept = survivingWords(words, parsed.text.split(/\s+/).filter(Boolean))
	const assignees = new Set(parsed.assignees.map(name => name.toLowerCase()))

	const kinds = new Map<number, MagicKind | null>()
	let current: MagicKind | null = null
	words.forEach((word, position) => {
		const tokenIndex = wordIndexes[position]!
		if (word.startsWith(prefixes.assignee) && assignees.has(word.slice(prefixes.assignee.length).toLowerCase())) {
			kinds.set(tokenIndex, 'assignee')
			current = null
			return
		}
		if (kept.has(position)) {
			kinds.set(tokenIndex, null)
			current = null
			return
		}
		// A quoted multi-word label or project continues the kind of its first word.
		current = prefixKind(word, prefixes) ?? (current === 'label' || current === 'project' ? current : 'date')
		kinds.set(tokenIndex, current)
	})

	const segments: MagicSegment[] = []
	tokens.forEach((token, index) => {
		if (token === '') {
			return
		}
		// Whitespace joins the magic around it only when both sides are the same kind.
		const kind = index % 2 === 0
			? kinds.get(index) ?? null
			: (kinds.get(index - 1) ?? null) === (kinds.get(index + 1) ?? null) ? kinds.get(index - 1) ?? null : null
		const last = segments.at(-1)
		if (last && last.kind === kind) {
			last.text += token
		} else {
			segments.push({text: token, kind})
		}
	})
	return segments
}
