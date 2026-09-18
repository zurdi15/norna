import {acceptHMRUpdate, defineStore} from 'pinia'
import {useMutation} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'
import {
	bulkUpdateTasksMutationOptions,
	deleteTaskMutationOptions,
	duplicateTaskMutationOptions,
	patchTaskMutationOptions,
	toggleTaskFavoriteMutationOptions,
	type TaskPatch,
} from '@/client/queries/tasks'
import {playPopSound} from '@/helpers/playPop'
import {translate} from '@/i18n'
import {error, success} from '@/message'
import router from '@/router'
import {confirm} from '@/ui/confirm'

const t = translate

/**
 * Task actions shared by every row, card and detail. They live in a store so an undo
 * offered in a toast still works after the row that triggered it left the list.
 */
export const useTaskActionsStore = defineStore('taskActions', () => {
	// Silent patches: each action says what happened in its own words, with an undo.
	const patch = useMutation(patchTaskMutationOptions(() => undefined), queryClient)
	const favorite = useMutation(toggleTaskFavoriteMutationOptions(), queryClient)
	const duplicate = useMutation(duplicateTaskMutationOptions(), queryClient)
	const remove = useMutation(deleteTaskMutationOptions(), queryClient)
	const bulk = useMutation(bulkUpdateTasksMutationOptions(), queryClient)

	/** Patches fields of a task; a failure is already reported by the mutation. */
	async function update(task: Task, changes: TaskPatch) {
		if (task.id === undefined) {
			return
		}
		try {
			await patch.mutateAsync({id: task.id, patch: changes})
		} catch {
			// Reported by the mutation's error toast.
		}
	}

	function setDone(task: Task, done: boolean) {
		if (task.id === undefined) {
			return
		}
		if (done) {
			playPopSound()
		}
		void update(task, {done})
		// Right away, not on success: the row may leave a list of open tasks before the answer.
		success({message: t(done ? 'tasks.actions.doneToast' : 'tasks.actions.undoneToast', {title: task.title})}, [{
			title: t('tasks.actions.undo'),
			callback: () => void update(task, {done: !done}),
		}])
	}

	function setDueDate(task: Task, date: Date | null) {
		const previous = task.due_date ?? null
		void update(task, {due_date: date})
		success({message: date ? t('tasks.actions.dueSet') : t('tasks.actions.dueRemoved')}, [{
			title: t('tasks.actions.undo'),
			callback: () => void update(task, {due_date: previous}),
		}])
	}

	function setPriority(task: Task, priority: number) {
		void update(task, {priority})
	}

	function toggleFavorite(task: Task) {
		if (task.id !== undefined) {
			favorite.mutate({id: task.id, isFavorite: !task.is_favorite})
		}
	}

	async function duplicateTask(task: Task) {
		if (task.id === undefined) {
			return
		}
		try {
			const copy = await duplicate.mutateAsync(task.id)
			success({message: t('tasks.actions.duplicated')}, [{
				title: t('tasks.actions.open'),
				callback: () => void router.push({name: 'task.detail', params: {id: copy.id}}),
			}])
		} catch {
			// The mutation already reported the error.
		}
	}

	async function deleteTask(task: Task): Promise<boolean> {
		if (task.id === undefined) {
			return false
		}
		const confirmed = await confirm({
			title: t('tasks.actions.deleteTitle'),
			description: t('tasks.actions.deleteDescription', {title: task.title}),
			confirmLabel: t('tasks.actions.delete'),
			tone: 'danger',
		})
		if (!confirmed) {
			return false
		}
		try {
			await remove.mutateAsync(task.id)
			return true
		} catch {
			return false
		}
	}

	function taskIds(tasks: readonly Task[]): number[] {
		return tasks.map(task => task.id).filter((id): id is number => id !== undefined)
	}

	/** One change to several tasks; done and due dates can be undone from the toast. */
	async function bulkUpdate(tasks: readonly Task[], changes: TaskPatch) {
		const ids = taskIds(tasks)
		if (ids.length === 0) {
			return
		}
		try {
			await bulk.mutateAsync({ids, patch: changes})
		} catch {
			return
		}
		const undo = changes.done !== undefined || changes.due_date !== undefined
		success({message: t('tasks.bulk.updated', ids.length)}, undo ? [{
			title: t('tasks.actions.undo'),
			// Each task gets its own previous value back.
			callback: () => {
				for (const task of tasks) {
					void update(task, {
						...(changes.done !== undefined ? {done: task.done ?? false} : {}),
						...(changes.due_date !== undefined ? {due_date: task.due_date ?? null} : {}),
					})
				}
			},
		}] : [])
	}

	async function bulkDelete(tasks: readonly Task[]): Promise<boolean> {
		const ids = taskIds(tasks)
		if (ids.length === 0) {
			return false
		}
		const confirmed = await confirm({
			title: t('tasks.bulk.deleteTitle', ids.length),
			description: t('tasks.bulk.deleteDescription'),
			confirmLabel: t('tasks.actions.delete'),
			tone: 'danger',
		})
		if (!confirmed) {
			return false
		}
		const results = await Promise.allSettled(ids.map(id => remove.mutateAsync(id)))
		return results.every(result => result.status === 'fulfilled')
	}

	async function copyLink(task: Task) {
		if (task.id === undefined) {
			return
		}
		const url = new URL(router.resolve({name: 'task.detail', params: {id: task.id}}).href, window.location.origin).href
		try {
			await navigator.clipboard.writeText(url)
			success({message: t('tasks.actions.linkCopied')})
		} catch (cause) {
			error(cause)
		}
	}

	return {
		update,
		setDone,
		setDueDate,
		setPriority,
		toggleFavorite,
		duplicateTask,
		deleteTask,
		bulkUpdate,
		bulkDelete,
		copyLink,
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useTaskActionsStore, import.meta.hot))
}
