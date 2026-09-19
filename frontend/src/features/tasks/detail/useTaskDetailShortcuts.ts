import {useEventListener} from '@vueuse/core'

import {SHORTCUTS} from '@/constants/shortcuts'
import {isFormField, matchesKey, parseKey} from '@/helpers/shortcut'

type TaskDetailAction = keyof typeof SHORTCUTS.taskDetail

/**
 * One-key actions on the open task (t completes it, l opens the labels…). They stay
 * out of the way while typing and while a picker, menu or dialog has the keyboard.
 */
export function useTaskDetailShortcuts(handlers: Partial<Record<TaskDetailAction, () => void>>) {
	const bindings = (Object.entries(SHORTCUTS.taskDetail) as [TaskDetailAction, string][])
		.map(([action, key]) => ({action, key: parseKey(key)}))

	useEventListener(window, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented || event.repeat || isFormField(event.target)
			|| document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]')) {
			return
		}
		const match = bindings.find(binding => matchesKey(event, binding.key))
		const handler = match && handlers[match.action]
		if (handler) {
			event.preventDefault()
			handler()
		}
	})
}
