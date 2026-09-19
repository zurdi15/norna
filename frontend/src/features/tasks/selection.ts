import {inject, provide, shallowRef, type InjectionKey} from 'vue'

import type {Task} from '@/client/generated'

export interface TaskSelection {
	readonly tasks: readonly Task[]
	readonly active: boolean
	isSelected: (id: number | undefined) => boolean
	toggle: (task: Task) => void
	clear: () => void
}

const TASK_SELECTION: InjectionKey<TaskSelection> = Symbol('task selection')

/**
 * The tasks picked for a bulk action on a page. The page provides it; rows read it
 * through useTaskSelection() and, once something is picked, a tap selects instead
 * of opening. Selected tasks are kept whole, so the bar can act on them as shown.
 */
export function provideTaskSelection(): TaskSelection {
	const selected = shallowRef<Map<number, Task>>(new Map())

	const selection: TaskSelection = {
		get tasks() {
			return [...selected.value.values()]
		},
		get active() {
			return selected.value.size > 0
		},
		isSelected: id => id !== undefined && selected.value.has(id),
		toggle: task => {
			if (task.id === undefined) {
				return
			}
			const next = new Map(selected.value)
			if (next.has(task.id)) {
				next.delete(task.id)
			} else {
				next.set(task.id, task)
			}
			selected.value = next
		},
		clear: () => {
			selected.value = new Map()
		},
	}
	// The getters read the shallowRef, so templates and computeds using them stay reactive.
	provide(TASK_SELECTION, selection)
	return selection
}

export function useTaskSelection(): TaskSelection | undefined {
	return inject(TASK_SELECTION, undefined)
}
