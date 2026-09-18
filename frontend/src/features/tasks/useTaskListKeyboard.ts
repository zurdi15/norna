import {nextTick, ref, watch, type Ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useEventListener} from '@vueuse/core'

import type {Task} from '@/client/generated'
import {isFormField} from '@/helpers/shortcut'

import {useTaskLink} from './useTaskLink'

// A modal, sheet or menu owns the keyboard while it is open.
function overlayOpen(): boolean {
	return document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]') !== null
}

/**
 * j/k move a cursor through the tasks of the page and Enter opens the task under it.
 * While the detail panel is open, moving the cursor also opens the next task in it.
 */
export function useTaskListKeyboard(tasks: Ref<readonly Task[]>, enabled: Ref<boolean>) {
	const route = useRoute()
	const router = useRouter()
	const taskLink = useTaskLink()
	const activeId = ref<number | null>(null)

	// The open task is where the cursor starts when the panel shows it.
	watch(() => route.name === 'task.detail' ? Number(route.params.id) : null, id => {
		if (id !== null && tasks.value.some(task => task.id === id)) {
			activeId.value = id
		}
	}, {immediate: true})

	function open(task: Task) {
		void router.push(taskLink(task.id ?? 0))
	}

	function move(step: number) {
		const list = tasks.value
		if (list.length === 0) {
			return
		}
		const index = list.findIndex(task => task.id === activeId.value)
		const next = index === -1
			? (step > 0 ? 0 : list.length - 1)
			: Math.min(list.length - 1, Math.max(0, index + step))
		const task = list[next]!
		activeId.value = task.id ?? null
		void nextTick(() => document.querySelector(`[data-task-row="${task.id}"]`)?.scrollIntoView({block: 'nearest'}))
		if (route.name === 'task.detail') {
			open(task)
		}
	}

	useEventListener(window, 'keydown', (event: KeyboardEvent) => {
		if (!enabled.value || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey
			|| isFormField(event.target) || overlayOpen()) {
			return
		}
		switch (event.key) {
			case 'j':
				event.preventDefault()
				move(1)
				break
			case 'k':
				event.preventDefault()
				move(-1)
				break
			case 'Enter':
			case 'o': {
				const task = tasks.value.find(candidate => candidate.id === activeId.value)
				// Enter on a focused link or button already does its own thing.
				if (task && (event.key === 'o' || event.target === document.body)) {
					event.preventDefault()
					open(task)
				}
				break
			}
			case 'Escape':
				if (activeId.value !== null && route.name !== 'task.detail') {
					activeId.value = null
				}
				break
		}
	})

	return {activeId}
}
