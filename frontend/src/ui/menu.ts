import type {Component} from 'vue'

export interface UiMenuAction {
	type?: 'item'
	label: string
	icon?: Component
	// Hint only; the shortcut itself is registered elsewhere.
	shortcut?: string
	tone?: 'default' | 'danger'
	disabled?: boolean
	onSelect: () => void
}

export interface UiMenuSeparator {
	type: 'separator'
}

export interface UiMenuHeading {
	type: 'label'
	label: string
}

export type UiMenuEntry = UiMenuAction | UiMenuSeparator | UiMenuHeading

export const menuPanelClass = [
	'z-(--z-overlay) min-w-52 rounded-lg border border-line bg-surface-raised p-1 shadow-overlay focus:outline-none',
	'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
]
