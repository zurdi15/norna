import {toValue, type MaybeRefOrGetter} from 'vue'
import type {MentionNodeAttrs} from '@tiptap/extension-mention'

import {searchProjectUsers} from '@/client/queries/userSearch'
import {getDisplayName} from '@/modules/user/displayName'

import MentionList from './MentionList.vue'
import {createSuggestionRenderer, type SuggestionRenderProps} from '../suggestionRenderer'

export interface MentionItem extends MentionNodeAttrs {
	id: string
	label: string
	username: string
}

interface MentionRenderProps extends SuggestionRenderProps {
	items: MentionItem[]
}

// The project comes from the task, which may still be loading when the editor is created.
export default function mentionSuggestionSetup(projectId: MaybeRefOrGetter<number | undefined>) {
	return {
		char: '@',
		debounce: 300,
		// Without a project there is nobody to mention; stored mentions still render.
		allow: () => Boolean(toValue(projectId)),

		items: async ({query}: {query: string}): Promise<MentionItem[]> => {
			const project = toValue(projectId)
			if (!project) {
				return []
			}
			try {
				// The server searches usernames and display names.
				const users = await searchProjectUsers(project, query)
				return users
					.flatMap(user => user.username ? [{id: user.username, label: getDisplayName(user), username: user.username}] : [])
					.slice(0, query ? 10 : 5)
			} catch (error) {
				console.error('Failed to fetch users for mentions:', error)
				return []
			}
		},

		render: createSuggestionRenderer<MentionRenderProps>(MentionList),
	}
}
