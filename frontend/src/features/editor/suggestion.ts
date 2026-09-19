import type {Component} from 'vue'
import type {Editor, Range} from '@tiptap/core'
import {
	Heading1,
	Heading2,
	Heading3,
	Image,
	List,
	ListChecks,
	ListOrdered,
	Minus,
	Quote,
	SquareCode,
	Table,
	Type,
} from '@lucide/vue'

import {matchesSearch} from '@/ui/search'

import CommandsList from './CommandsList.vue'
import {createSuggestionRenderer, type SuggestionRenderProps} from './suggestionRenderer'

type TranslateFunction = (key: string) => string

export interface CommandItem {
	id: string
	title: string
	description: string
	icon: Component
	command: (params: {editor: Editor, range: Range}) => void
}

export interface SlashCommandOptions {
	// Image upload needs a task to attach the file to.
	canInsertImage: () => boolean
	pickImage: () => void
}

function blockCommand(apply: (editor: Editor) => void) {
	return ({editor, range}: {editor: Editor, range: Range}) => {
		editor.chain().focus().deleteRange(range).run()
		apply(editor)
	}
}

export function getSlashCommands(t: TranslateFunction, options: SlashCommandOptions): CommandItem[] {
	const commands: (CommandItem | false)[] = [
		{
			id: 'text',
			title: t('input.editor.text'),
			description: t('input.editor.textTooltip'),
			icon: Type,
			command: blockCommand(editor => editor.chain().focus().setParagraph().run()),
		},
		{
			id: 'heading1',
			title: t('input.editor.heading1'),
			description: t('input.editor.heading1Tooltip'),
			icon: Heading1,
			command: blockCommand(editor => editor.chain().focus().setNode('heading', {level: 1}).run()),
		},
		{
			id: 'heading2',
			title: t('input.editor.heading2'),
			description: t('input.editor.heading2Tooltip'),
			icon: Heading2,
			command: blockCommand(editor => editor.chain().focus().setNode('heading', {level: 2}).run()),
		},
		{
			id: 'heading3',
			title: t('input.editor.heading3'),
			description: t('input.editor.heading3Tooltip'),
			icon: Heading3,
			command: blockCommand(editor => editor.chain().focus().setNode('heading', {level: 3}).run()),
		},
		{
			id: 'taskList',
			title: t('input.editor.taskList'),
			description: t('input.editor.taskListTooltip'),
			icon: ListChecks,
			command: blockCommand(editor => editor.chain().focus().toggleTaskList().run()),
		},
		{
			id: 'bulletList',
			title: t('input.editor.bulletList'),
			description: t('input.editor.bulletListTooltip'),
			icon: List,
			command: blockCommand(editor => editor.chain().focus().toggleBulletList().run()),
		},
		{
			id: 'orderedList',
			title: t('input.editor.orderedList'),
			description: t('input.editor.orderedListTooltip'),
			icon: ListOrdered,
			command: blockCommand(editor => editor.chain().focus().toggleOrderedList().run()),
		},
		{
			id: 'quote',
			title: t('input.editor.quote'),
			description: t('input.editor.quoteTooltip'),
			icon: Quote,
			command: blockCommand(editor => editor.chain().focus().toggleBlockquote().run()),
		},
		{
			id: 'codeBlock',
			title: t('editor.codeBlock'),
			description: t('input.editor.codeTooltip'),
			icon: SquareCode,
			command: blockCommand(editor => editor.chain().focus().toggleCodeBlock().run()),
		},
		options.canInsertImage() && {
			id: 'image',
			title: t('input.editor.image'),
			description: t('editor.imageTooltip'),
			icon: Image,
			command: blockCommand(() => options.pickImage()),
		},
		{
			id: 'table',
			title: t('input.editor.table.title'),
			description: t('editor.tableTooltip'),
			icon: Table,
			command: blockCommand(editor => editor.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run()),
		},
		{
			id: 'divider',
			title: t('editor.divider'),
			description: t('input.editor.horizontalRuleTooltip'),
			icon: Minus,
			command: blockCommand(editor => editor.chain().focus().setHorizontalRule().run()),
		},
	]
	return commands.filter(command => command !== false)
}

interface CommandsRenderProps extends SuggestionRenderProps {
	items: CommandItem[]
}

export default function suggestionSetup(t: TranslateFunction, options: SlashCommandOptions) {
	return {
		// Matching the id too keeps English names like "/quote" working in any language.
		items: ({query}: {query: string}) => getSlashCommands(t, options)
			.filter(item => matchesSearch(item.title, query) || matchesSearch(item.id, query)),

		render: createSuggestionRenderer<CommandsRenderProps>(CommandsList),
	}
}
