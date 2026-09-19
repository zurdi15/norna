<script setup lang="ts">
import {useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Editor} from '@tiptap/core'

import UserAvatar from '@/features/shell/UserAvatar.vue'

import SuggestionList from '../SuggestionList.vue'
import type {SuggestionListHandle} from '../suggestionRenderer'
import type {MentionItem} from './mentionSuggestion'

defineProps<{
	items: MentionItem[]
	command: (item: MentionItem) => void
	editor: Editor
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const list = useTemplateRef<{onKeyDown: (event: KeyboardEvent) => boolean}>('list')

defineExpose<SuggestionListHandle>({
	onKeyDown: ({event}) => list.value?.onKeyDown(event) ?? false,
})
</script>

<template>
	<SuggestionList
		ref="list"
		:items="items"
		:editor="editor"
		:item-key="item => item.id"
		:label="t('editor.mentions')"
		:empty-text="t('task.mention.noUsersFound')"
		@select="command"
	>
		<template #item="{item}">
			<UserAvatar
				:username="item.username"
				:name="item.label"
				size="lg"
			/>
			<span class="grid min-w-0 flex-1">
				<span class="truncate text-base pointer-coarse:text-md">{{ item.label }}</span>
				<span
					v-if="item.label !== item.username"
					class="truncate text-xs text-ink-faint"
				>@{{ item.username }}</span>
			</span>
		</template>
	</SuggestionList>
</template>
