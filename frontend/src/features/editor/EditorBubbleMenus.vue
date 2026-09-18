<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {isTextSelection, type Editor} from '@tiptap/core'
import type {EditorState} from '@tiptap/pm/state'
import type {EditorView} from '@tiptap/pm/view'
import {BubbleMenu} from '@tiptap/vue-3/menus'
import {ArrowUpRight, Link, Pencil, TextCursorInput, Unlink} from '@lucide/vue'

import {cn} from '@/ui/cn'
import UiButton from '@/ui/UiButton.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import {blockActions, findTableDom, headingActions, markActions, tableActions, type EditorAction} from './formatting'

const props = defineProps<{
	editor: Editor
}>()

const emit = defineEmits<{
	editLink: []
	editAlt: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()

interface ShouldShowProps {
	editor: Editor
	element: HTMLElement
	view: EditorView
	state: EditorState
	from: number
	to: number
}

// The plugin's own guard, which a custom shouldShow replaces: menus only follow a focused editor.
function hasFocus({view, element}: ShouldShowProps) {
	return view.hasFocus() || element.contains(document.activeElement)
}

function showTextMenu(props: ShouldShowProps) {
	const {editor, state, from, to} = props
	if (!editor.isEditable || !hasFocus(props) || from === to) {
		return false
	}
	// A double click on an empty paragraph reports a range with no text in it.
	if (isTextSelection(state.selection) && state.doc.textBetween(from, to).length === 0) {
		return false
	}
	return !['image', 'taskLink', 'mention', 'codeBlock'].some(name => editor.isActive(name))
}

function showLinkMenu(props: ShouldShowProps) {
	return props.editor.isEditable && hasFocus(props) && props.state.selection.empty && props.editor.isActive('link')
}

function showImageMenu(props: ShouldShowProps) {
	return props.editor.isEditable && hasFocus(props) && props.editor.isActive('image')
}

function showTableMenu(props: ShouldShowProps) {
	return props.editor.isEditable && hasFocus(props) && props.editor.isActive('table')
}

function tableReference() {
	const dom = findTableDom(props.editor)
	return dom ? {getBoundingClientRect: () => dom.getBoundingClientRect()} : null
}

const linkHref = computed(() => String(props.editor.getAttributes('link').href ?? ''))

const textGroups: EditorAction[][] = [markActions, headingActions, blockActions.slice(0, 4)]

const panelClass = cn(
	'flex items-center gap-0.5 rounded-lg border border-line bg-surface-raised p-1 text-ink shadow-overlay',
	'animate-pop-in',
)

const toolClass = 'aria-pressed:bg-accent-subtle aria-pressed:text-accent'
</script>

<template>
	<!-- mousedown.prevent keeps the focus and the selection in the editor while clicking the menus. -->
	<BubbleMenu
		plugin-key="textBubbleMenu"
		:editor="editor"
		:should-show="showTextMenu"
		:options="{placement: 'top', offset: 8, shift: {padding: 8}}"
		class="z-(--z-overlay)"
	>
		<div
			role="toolbar"
			:aria-label="t('input.editor.toolbarLabel')"
			:class="panelClass"
			@mousedown.prevent
		>
			<template
				v-for="(group, index) in textGroups"
				:key="index"
			>
				<span
					v-if="index > 0"
					class="mx-0.5 h-4 w-px bg-line"
					aria-hidden="true"
				/>
				<UiIconButton
					v-for="action in group"
					:key="action.id"
					:icon="action.icon"
					:label="t(action.label)"
					:shortcut="action.shortcut"
					:aria-pressed="action.isActive?.(editor) ?? false"
					size="sm"
					:class="toolClass"
					@click="action.run(editor)"
				/>
				<UiIconButton
					v-if="index === 0"
					:icon="Link"
					:label="t('input.editor.link')"
					:aria-pressed="editor.isActive('link')"
					size="sm"
					:class="toolClass"
					@click="emit('editLink')"
				/>
			</template>
		</div>
	</BubbleMenu>

	<BubbleMenu
		plugin-key="linkBubbleMenu"
		:editor="editor"
		:should-show="showLinkMenu"
		:options="{placement: 'bottom-start', offset: 6, shift: {padding: 8}}"
		class="z-(--z-overlay)"
	>
		<div
			:class="panelClass"
			@mousedown.prevent
		>
			<a
				:href="linkHref"
				target="_blank"
				rel="noopener noreferrer nofollow"
				class="flex h-7 max-w-64 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm text-accent hover:bg-canvas-subtle"
			>
				<span class="truncate">{{ linkHref }}</span>
				<ArrowUpRight
					class="size-3.5 shrink-0"
					aria-hidden="true"
				/>
			</a>
			<span
				class="mx-0.5 h-4 w-px bg-line"
				aria-hidden="true"
			/>
			<UiIconButton
				:icon="Pencil"
				:label="t('editor.link.edit')"
				size="sm"
				@click="emit('editLink')"
			/>
			<UiIconButton
				:icon="Unlink"
				:label="t('editor.link.remove')"
				size="sm"
				@click="editor.chain().focus().extendMarkRange('link').unsetLink().run()"
			/>
		</div>
	</BubbleMenu>

	<BubbleMenu
		plugin-key="imageBubbleMenu"
		:editor="editor"
		:should-show="showImageMenu"
		:options="{placement: 'top', offset: 8}"
		class="z-(--z-overlay)"
	>
		<div
			:class="panelClass"
			@mousedown.prevent
		>
			<UiButton
				variant="ghost"
				size="sm"
				:icon="TextCursorInput"
				@click="emit('editAlt')"
			>
				{{ t('input.editor.altText') }}
			</UiButton>
		</div>
	</BubbleMenu>

	<BubbleMenu
		plugin-key="tableBubbleMenu"
		:editor="editor"
		:should-show="showTableMenu"
		:get-referenced-virtual-element="tableReference"
		:options="{placement: 'top-end', offset: 6, shift: {padding: 8}}"
		class="z-(--z-overlay)"
	>
		<div
			role="toolbar"
			:aria-label="t('input.editor.table.title')"
			:class="panelClass"
			@mousedown.prevent
		>
			<template
				v-for="action in tableActions"
				:key="action.id"
			>
				<span
					v-if="action.id === 'deleteRow'"
					class="mx-0.5 h-4 w-px bg-line"
					aria-hidden="true"
				/>
				<UiIconButton
					:icon="action.icon"
					:label="t(action.label)"
					:disabled="action.isDisabled?.(editor) ?? false"
					size="sm"
					:class="action.id === 'deleteTable' && 'text-danger hover:text-danger'"
					@click="action.run(editor)"
				/>
			</template>
		</div>
	</BubbleMenu>
</template>
