import type {Editor} from '@tiptap/core'

// Popups mount next to the editor's dialog, if any: a native <dialog> renders in the top layer
// above anything appended to <body>, and a modal Reka dialog blocks pointer events outside itself.
export function getPopupContainer(editor?: Editor): HTMLElement {
	const dom = editor?.view?.dom as HTMLElement | undefined
	return dom?.closest<HTMLElement>('dialog[open], [role="dialog"]') ?? document.body
}
