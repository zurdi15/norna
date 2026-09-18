import type {Component} from 'vue'
import type {Editor} from '@tiptap/core'
import {
	BetweenHorizontalEnd,
	BetweenHorizontalStart,
	BetweenVerticalEnd,
	BetweenVerticalStart,
	Bold,
	Code,
	Grid2x2X,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListChecks,
	ListOrdered,
	Minus,
	Quote,
	Redo2,
	Rows2,
	Columns2,
	SquareCode,
	Strikethrough,
	Table,
	TableCellsMerge,
	TableProperties,
	Underline,
	Undo2,
} from '@lucide/vue'

import type {UiMenuEntry} from '@/ui/menu'

/** One formatting control, shared by the bubble menu (pointer) and the keyboard toolbar (touch). */
export interface EditorAction {
	id: string
	// i18n key
	label: string
	icon: Component
	// Display hint only; TipTap's keymaps do the work.
	shortcut?: string
	isActive?: (editor: Editor) => boolean
	isDisabled?: (editor: Editor) => boolean
	run: (editor: Editor) => void
}

function focused(editor: Editor) {
	return editor.chain().focus()
}

export const markActions: EditorAction[] = [
	{
		id: 'bold',
		label: 'input.editor.bold',
		icon: Bold,
		shortcut: 'Mod+B',
		isActive: editor => editor.isActive('bold'),
		run: editor => focused(editor).toggleBold().run(),
	},
	{
		id: 'italic',
		label: 'input.editor.italic',
		icon: Italic,
		shortcut: 'Mod+I',
		isActive: editor => editor.isActive('italic'),
		run: editor => focused(editor).toggleItalic().run(),
	},
	{
		id: 'underline',
		label: 'input.editor.underline',
		icon: Underline,
		shortcut: 'Mod+U',
		isActive: editor => editor.isActive('underline'),
		run: editor => focused(editor).toggleUnderline().run(),
	},
	{
		id: 'strike',
		label: 'input.editor.strikethrough',
		icon: Strikethrough,
		shortcut: 'Mod+Shift+S',
		isActive: editor => editor.isActive('strike'),
		run: editor => focused(editor).toggleStrike().run(),
	},
	{
		id: 'code',
		label: 'editor.inlineCode',
		icon: Code,
		shortcut: 'Mod+E',
		isActive: editor => editor.isActive('code'),
		run: editor => focused(editor).toggleCode().run(),
	},
]

export const headingActions: EditorAction[] = ([1, 2, 3] as const).map(level => ({
	id: `heading${level}`,
	label: `input.editor.heading${level}`,
	icon: [Heading1, Heading2, Heading3][level - 1]!,
	shortcut: `Mod+Alt+${level}`,
	isActive: editor => editor.isActive('heading', {level}),
	run: editor => focused(editor).toggleHeading({level}).run(),
}))

export const blockActions: EditorAction[] = [
	{
		id: 'taskList',
		label: 'input.editor.taskList',
		icon: ListChecks,
		shortcut: 'Mod+Shift+9',
		isActive: editor => editor.isActive('taskList'),
		run: editor => focused(editor).toggleTaskList().run(),
	},
	{
		id: 'bulletList',
		label: 'input.editor.bulletList',
		icon: List,
		shortcut: 'Mod+Shift+8',
		isActive: editor => editor.isActive('bulletList'),
		run: editor => focused(editor).toggleBulletList().run(),
	},
	{
		id: 'orderedList',
		label: 'input.editor.orderedList',
		icon: ListOrdered,
		shortcut: 'Mod+Shift+7',
		isActive: editor => editor.isActive('orderedList'),
		run: editor => focused(editor).toggleOrderedList().run(),
	},
	{
		id: 'quote',
		label: 'input.editor.quote',
		icon: Quote,
		shortcut: 'Mod+Shift+B',
		isActive: editor => editor.isActive('blockquote'),
		run: editor => focused(editor).toggleBlockquote().run(),
	},
	{
		id: 'codeBlock',
		label: 'editor.codeBlock',
		icon: SquareCode,
		shortcut: 'Mod+Alt+C',
		isActive: editor => editor.isActive('codeBlock'),
		run: editor => focused(editor).toggleCodeBlock().run(),
	},
]

export const insertActions: EditorAction[] = [
	{
		id: 'table',
		label: 'input.editor.table.insert',
		icon: Table,
		isDisabled: editor => editor.isActive('table'),
		run: editor => focused(editor).insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(),
	},
	{
		id: 'divider',
		label: 'editor.divider',
		icon: Minus,
		run: editor => focused(editor).setHorizontalRule().run(),
	},
]

export const historyActions: EditorAction[] = [
	{
		id: 'undo',
		label: 'input.editor.undo',
		icon: Undo2,
		shortcut: 'Mod+Z',
		isDisabled: editor => !editor.can().undo(),
		run: editor => focused(editor).undo().run(),
	},
	{
		id: 'redo',
		label: 'input.editor.redo',
		icon: Redo2,
		shortcut: 'Mod+Shift+Z',
		isDisabled: editor => !editor.can().redo(),
		run: editor => focused(editor).redo().run(),
	},
]

export const tableActions: EditorAction[] = [
	{
		id: 'addRowBefore',
		label: 'input.editor.table.addRowBefore',
		icon: BetweenHorizontalStart,
		isDisabled: editor => !editor.can().addRowBefore(),
		run: editor => focused(editor).addRowBefore().run(),
	},
	{
		id: 'addRowAfter',
		label: 'input.editor.table.addRowAfter',
		icon: BetweenHorizontalEnd,
		isDisabled: editor => !editor.can().addRowAfter(),
		run: editor => focused(editor).addRowAfter().run(),
	},
	{
		id: 'addColumnBefore',
		label: 'input.editor.table.addColumnBefore',
		icon: BetweenVerticalStart,
		isDisabled: editor => !editor.can().addColumnBefore(),
		run: editor => focused(editor).addColumnBefore().run(),
	},
	{
		id: 'addColumnAfter',
		label: 'input.editor.table.addColumnAfter',
		icon: BetweenVerticalEnd,
		isDisabled: editor => !editor.can().addColumnAfter(),
		run: editor => focused(editor).addColumnAfter().run(),
	},
	{
		id: 'toggleHeaderRow',
		label: 'input.editor.table.toggleHeaderRow',
		icon: TableProperties,
		isDisabled: editor => !editor.can().toggleHeaderRow(),
		run: editor => focused(editor).toggleHeaderRow().run(),
	},
	{
		id: 'mergeOrSplit',
		label: 'input.editor.table.mergeOrSplit',
		icon: TableCellsMerge,
		isDisabled: editor => !editor.can().mergeOrSplit(),
		run: editor => focused(editor).mergeOrSplit().run(),
	},
	{
		id: 'deleteRow',
		label: 'input.editor.table.deleteRow',
		icon: Rows2,
		isDisabled: editor => !editor.can().deleteRow(),
		run: editor => focused(editor).deleteRow().run(),
	},
	{
		id: 'deleteColumn',
		label: 'input.editor.table.deleteColumn',
		icon: Columns2,
		isDisabled: editor => !editor.can().deleteColumn(),
		run: editor => focused(editor).deleteColumn().run(),
	},
	{
		id: 'deleteTable',
		label: 'input.editor.table.deleteTable',
		icon: Grid2x2X,
		run: editor => focused(editor).deleteTable().run(),
	},
]

/** The table operations as an adaptive menu: a dropdown from md up, an action sheet below. */
export function tableMenuEntries(editor: Editor, t: (key: string) => string): UiMenuEntry[] {
	return tableActions.flatMap((action): UiMenuEntry[] => [
		...(action.id === 'toggleHeaderRow' || action.id === 'deleteRow' ? [{type: 'separator' as const}] : []),
		{
			label: t(action.label),
			icon: action.icon,
			disabled: action.isDisabled?.(editor) ?? false,
			tone: action.id === 'deleteTable' ? 'danger' : 'default',
			onSelect: () => action.run(editor),
		},
	])
}

// The table's wrapper element, to anchor the table menu on.
export function findTableDom(editor: Editor): HTMLElement | null {
	const {$from} = editor.state.selection
	for (let depth = $from.depth; depth > 0; depth--) {
		if ($from.node(depth).type.name === 'table') {
			const dom = editor.view.nodeDOM($from.before(depth))
			return dom instanceof HTMLElement ? dom : null
		}
	}
	return null
}
