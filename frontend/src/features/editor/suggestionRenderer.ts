import type {Component} from 'vue'
import type {Editor} from '@tiptap/core'
import {VueRenderer} from '@tiptap/vue-3'

import {getPopupContainer} from './popupContainer'
import {createSuggestionPopup, type SuggestionPopup} from './suggestionPopup'

export interface SuggestionRenderProps {
	editor: Editor
	clientRect?: (() => DOMRect | null) | null
	items: unknown[]
	query: string
}

export interface SuggestionListHandle {
	onKeyDown: (props: {event: KeyboardEvent}) => boolean
}

let listSequence = 0

// Suggestion lists render in separate Vue roots, where useId() would restart and collide.
export function nextSuggestionListId(): string {
	listSequence += 1
	return `editor-suggestions-${listSequence}`
}

/**
 * Mounts a suggestion list component in a floating popup next to the caret.
 *
 * onExit can run without a matching onStart (tiptap recreates the plugin view while a
 * suggestion is active), so every hook tolerates an unmounted list.
 */
export function createSuggestionRenderer<P extends SuggestionRenderProps>(
	component: Component,
	shouldMount: (props: P) => boolean = () => true,
) {
	return () => {
		let renderer: VueRenderer | null = null
		let popup: SuggestionPopup | null = null
		let latest: P | null = null

		function unmount() {
			popup?.destroy()
			popup = null
			renderer?.destroy()
			renderer = null
		}

		function mount(props: P) {
			unmount()
			renderer = new VueRenderer(component, {props, editor: props.editor})
			const element = renderer.element
			if (!props.clientRect || !element) {
				unmount()
				return
			}
			popup = createSuggestionPopup(
				getPopupContainer(props.editor),
				element,
				() => latest?.clientRect?.() ?? null,
				props.editor.view.dom,
			)
		}

		return {
			onStart(props: P) {
				latest = props
				if (shouldMount(props)) {
					mount(props)
				}
			},

			onUpdate(props: P) {
				latest = props
				if (!renderer) {
					if (shouldMount(props)) {
						mount(props)
					}
					return
				}
				renderer.updateProps(props)
				popup?.reposition()
			},

			// The suggestion plugin handles Escape itself: it exits, which unmounts the list.
			onKeyDown({event}: {event: KeyboardEvent}): boolean {
				return (renderer?.ref as SuggestionListHandle | undefined)?.onKeyDown({event}) ?? false
			},

			onExit() {
				latest = null
				unmount()
			},
		}
	}
}
