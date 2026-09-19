<script setup lang="ts">
import {useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Editor} from '@tiptap/core'

import SuggestionList from '../SuggestionList.vue'
import type {SuggestionListHandle} from '../suggestionRenderer'
import type {EmojiEntry} from './emojiData'

defineProps<{
	items: EmojiEntry[]
	command: (item: EmojiEntry) => void
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
		:item-key="item => item.shortcode"
		:label="t('editor.emoji')"
		:empty-text="t('input.editor.emoji.empty')"
		class="w-64"
		@select="command"
	>
		<template #item="{item}">
			<span
				class="w-6 shrink-0 text-center text-xl"
				aria-hidden="true"
			>{{ item.emoji }}</span>
			<span class="grid min-w-0 flex-1">
				<span class="truncate font-mono text-sm">:{{ item.shortcode }}:</span>
				<span class="truncate text-xs text-ink-faint">{{ item.annotation }}</span>
			</span>
		</template>
	</SuggestionList>
</template>
