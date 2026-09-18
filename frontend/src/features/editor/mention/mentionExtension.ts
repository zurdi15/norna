import type {MaybeRefOrGetter} from 'vue'
import {mergeAttributes} from '@tiptap/core'
import Mention from '@tiptap/extension-mention'
import {VueNodeViewRenderer} from '@tiptap/vue-3'

import MentionUser from './MentionUser.vue'
import mentionSuggestionSetup from './mentionSuggestion'

// Stored as <mention-user data-id="username">: the backend reads that tag to notify the user.
// The @label text is only a fallback for plain renderers such as emails.
export function createMentionExtension(projectId: MaybeRefOrGetter<number | undefined>) {
	return Mention.configure({
		suggestion: mentionSuggestionSetup(projectId),
	}).extend({
		parseHTML() {
			return [{tag: 'mention-user'}]
		},

		renderHTML({node, HTMLAttributes}) {
			return ['mention-user', mergeAttributes(HTMLAttributes), `@${node.attrs.label ?? node.attrs.id}`]
		},

		addNodeView() {
			return VueNodeViewRenderer(MentionUser)
		},
	})
}
