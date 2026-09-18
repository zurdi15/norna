<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Editor} from '@tiptap/core'
import {AtSign, Check, Image, Link, Plus, Table2, TextCursorInput} from '@lucide/vue'

import {cn} from '@/ui/cn'
import {useKeyboardInset} from '@/ui/composables/useKeyboardInset'
import UiButton from '@/ui/UiButton.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {blockActions, headingActions, historyActions, insertActions, markActions, tableMenuEntries, type EditorAction} from './formatting'

/**
 * Formatting for touch screens: a strip pinned above the on-screen keyboard while the editor
 * has focus. It scrolls sideways; "Done" stays in reach at the end.
 */
const props = defineProps<{
	editor: Editor
	canInsertImage: boolean
	canMention: boolean
}>()

const emit = defineEmits<{
	editLink: []
	editAlt: []
	pickImage: []
	done: []
}>()

// True while the table sheet is open, so the parent keeps the toolbar (and the sheet) mounted.
const busy = defineModel<boolean>('busy', {default: false})

const {t} = useI18n()
const keyboardInset = useKeyboardInset()

const tableMenuOpen = ref(false)
watch(tableMenuOpen, open => busy.value = open)
const tableItems = computed(() => tableMenuOpen.value ? tableMenuEntries(props.editor, t) : [])

const groups = computed<EditorAction[][]>(() => [
	markActions,
	headingActions,
	blockActions,
	insertActions.filter(action => action.id !== 'table' || !props.editor.isActive('table')),
	historyActions,
])

// Suggestions only open after a space or at the start of a line. A leaf node right before the
// caret (a mention, a task link) counts as text, hence the '*' stand-in.
function insertTrigger(char: string) {
	const {$from} = props.editor.state.selection
	const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, undefined, '*')
	const prefix = before === '' || /\s/.test(before) ? '' : ' '
	props.editor.chain().focus().insertContent(prefix + char).run()
}

const toolClass = 'aria-pressed:bg-accent-subtle aria-pressed:text-accent'
</script>

<template>
	<!-- mousedown.prevent keeps the focus in the editor, so the keyboard stays open between taps. -->
	<div
		role="toolbar"
		:aria-label="t('input.editor.toolbarLabel')"
		:class="cn(
			'fixed inset-x-0 z-(--z-overlay) flex border-t border-line bg-surface-raised',
			keyboardInset === 0 && 'pb-safe',
		)"
		:style="{bottom: `${keyboardInset}px`}"
		@mousedown.prevent
	>
		<div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain px-1.5 py-2">
			<UiButton
				v-if="editor.isActive('image')"
				variant="ghost"
				size="lg"
				:icon="TextCursorInput"
				class="px-3"
				@click="emit('editAlt')"
			>
				{{ t('input.editor.altText') }}
			</UiButton>
			<UiMenu
				v-if="editor.isActive('table')"
				v-model:open="tableMenuOpen"
				:items="tableItems"
				:title="t('input.editor.table.title')"
				align="start"
				side="top"
			>
				<template #trigger>
					<UiButton
						variant="ghost"
						size="lg"
						:icon="Table2"
						class="px-3"
					>
						{{ t('input.editor.table.title') }}
					</UiButton>
				</template>
			</UiMenu>
			<UiIconButton
				:icon="Plus"
				:label="t('editor.insertBlock')"
				size="lg"
				@click="insertTrigger('/')"
			/>
			<UiIconButton
				v-if="canMention"
				:icon="AtSign"
				:label="t('editor.mention')"
				size="lg"
				@click="insertTrigger('@')"
			/>
			<template
				v-for="(group, index) in groups"
				:key="index"
			>
				<span
					class="mx-1 h-5 w-px shrink-0 bg-line"
					aria-hidden="true"
				/>
				<UiIconButton
					v-for="action in group"
					:key="action.id"
					:icon="action.icon"
					:label="t(action.label)"
					:aria-pressed="action.isActive ? action.isActive(editor) : undefined"
					:aria-disabled="action.isDisabled?.(editor) ? 'true' : undefined"
					size="lg"
					:class="toolClass"
					@click="action.isDisabled?.(editor) || action.run(editor)"
				/>
				<template v-if="index === 0">
					<UiIconButton
						:icon="Link"
						:label="t('input.editor.link')"
						:aria-pressed="editor.isActive('link')"
						size="lg"
						:class="toolClass"
						@click="emit('editLink')"
					/>
				</template>
				<template v-if="index === 3 && canInsertImage">
					<UiIconButton
						:icon="Image"
						:label="t('input.editor.image')"
						size="lg"
						@click="emit('pickImage')"
					/>
				</template>
			</template>
		</div>
		<div class="flex shrink-0 items-center border-s border-line px-1.5">
			<UiIconButton
				:icon="Check"
				:label="t('editor.done')"
				size="lg"
				class="text-accent"
				@click="emit('done')"
			/>
		</div>
	</div>
</template>
