<script setup lang="ts">
import {useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Editor} from '@tiptap/core'

import UiIcon from '@/ui/UiIcon.vue'

import SuggestionList from './SuggestionList.vue'
import type {CommandItem} from './suggestion'
import type {SuggestionListHandle} from './suggestionRenderer'

defineProps<{
	items: CommandItem[]
	command: (item: CommandItem) => void
	editor: Editor
}>()

// Rendered by the suggestion plugin with all of its props; only these matter here.
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
		:label="t('editor.commands')"
		:empty-text="t('ui.listbox.empty')"
		@select="command"
	>
		<template #item="{item}">
			<span class="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-muted">
				<UiIcon :icon="item.icon" />
			</span>
			<span class="grid min-w-0 flex-1">
				<span class="truncate text-base pointer-coarse:text-md">{{ item.title }}</span>
				<span class="truncate text-xs text-ink-faint">{{ item.description }}</span>
			</span>
		</template>
	</SuggestionList>
</template>
