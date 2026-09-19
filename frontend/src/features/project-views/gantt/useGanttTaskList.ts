import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {keepPreviousData, useQueries, useQuery} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {
	taskListQuery,
	usePatchTaskMutation,
	type TaskListParams,
	type TaskListScope,
	type TaskPage,
	type TaskPatch,
} from '@/client/queries/tasks'

/**
 * Every task of a view that the params match, all pages loaded, plus the date edits the
 * chart makes. Each page is its own list query, so edits made anywhere reach it through
 * the shared task caches.
 */
export function useGanttTaskList(
	scope: MaybeRefOrGetter<TaskListScope>,
	params: MaybeRefOrGetter<Omit<TaskListParams, 'page'>>,
) {
	const firstPage = useQuery(computed(() => ({
		...taskListQuery(toValue(scope), {...toValue(params), page: 1}),
		// Paging through ranges keeps the chart on screen while the next range loads; the
		// component is keyed by view, so these are always the same view's tasks.
		placeholderData: keepPreviousData,
	})))

	const otherPages = useQueries({
		queries: computed(() => {
			// The previous range's page count says nothing about the next range.
			if (firstPage.isPlaceholderData.value) {
				return []
			}
			const pages = firstPage.data.value?.total_pages ?? 1
			return Array.from({length: Math.max(pages - 1, 0)}, (_, index) =>
				taskListQuery(toValue(scope), {...toValue(params), page: index + 2}))
		}),
	})

	const tasks = computed<Task[]>(() => {
		const pages: (TaskPage | undefined)[] = [firstPage.data.value, ...otherPages.value.map(page => page.data)]
		const seen = new Set<number>()
		const result: Task[] = []
		for (const task of pages.flatMap(page => page?.items ?? [])) {
			// A task can move between pages while they load one after another.
			if (typeof task.id === 'number' && !seen.has(task.id)) {
				seen.add(task.id)
				result.push(task)
			}
		}
		return result
	})

	const isPending = computed(() => firstPage.isPending.value || otherPages.value.some(page => page.isPending))
	const isFetching = computed(() => firstPage.isFetching.value || otherPages.value.some(page => page.isFetching))

	// Silent: the chart says what changed itself, with an undo.
	const patch = usePatchTaskMutation(() => undefined)

	/** Saves a date change; resolves false when it failed (the mutation reports the error). */
	async function updateTask(task: Task, changes: TaskPatch): Promise<boolean> {
		if (task.id === undefined) {
			return false
		}
		try {
			await patch.mutateAsync({id: task.id, patch: changes})
			return true
		} catch {
			return false
		}
	}

	return {
		tasks,
		isPending,
		isFetching,
		error: firstPage.error,
		updateTask,
	}
}

export type UseGanttTaskListReturn = ReturnType<typeof useGanttTaskList>
