import type {Editor, Range} from '@tiptap/core'
import {PluginKey, type EditorState} from '@tiptap/pm/state'

import EmojiList from './EmojiList.vue'
import {loadEmojis, filterEmojis, type EmojiEntry} from './emojiData'
import {createSuggestionRenderer, type SuggestionRenderProps} from '../suggestionRenderer'

export const EmojiSuggestionPluginKey = new PluginKey('emojiSuggestion')

interface EmojiRenderProps extends SuggestionRenderProps {
	items: EmojiEntry[]
}

const SHORTCODE_RE = /^[a-zA-Z0-9_]*$/

export default function emojiSuggestionSetup() {
	return {
		pluginKey: EmojiSuggestionPluginKey,
		char: ':',
		allowedPrefixes: [' ', '\t', '\n'],
		startOfLine: false,

		allow: ({state, range}: {state: EditorState, range: Range}) => {
			const text = state.doc.textBetween(range.from, range.to, '\n', '\n')
			// Drop the leading ':' trigger character.
			const query = text.startsWith(':') ? text.slice(1) : text
			return SHORTCODE_RE.test(query)
		},

		items: async ({query}: {query: string}): Promise<EmojiEntry[]> => {
			if (query === '') return []
			try {
				const index = await loadEmojis()
				return filterEmojis(index, query)
			} catch (err) {
				console.error('Failed to load emoji index:', err)
				return []
			}
		},

		command: ({editor, range, props}: {editor: Editor, range: Range, props: EmojiEntry}) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent(props.emoji)
				.run()
		},

		// A lone ":" (a time, a smiley) opens nothing until a shortcode is being typed.
		render: createSuggestionRenderer<EmojiRenderProps>(EmojiList, props => props.items.length > 0 || props.query !== ''),
	}
}
