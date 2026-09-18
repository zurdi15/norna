import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {keepPreviousData, useQuery} from '@tanstack/vue-query'

import type {Task, TimeEntry} from '@/client/generated'
import {everyTaskQuery} from '@/client/queries/tasks'

/** The tasks behind a list of entries (which only carry the id), fetched together in one filtered list. */
export function useEntryTasks(entries: MaybeRefOrGetter<readonly TimeEntry[]>) {
	const ids = computed(() => [...new Set(toValue(entries)
		.map(entry => entry.task_id ?? 0)
		.filter(id => id > 0))]
		.sort((a, b) => a - b))

	const query = useQuery(computed(() => ({
		...everyTaskQuery({filter: `id in ${ids.value.join(', ')}`, per_page: 50}),
		enabled: ids.value.length > 0,
		placeholderData: keepPreviousData,
	})))

	return computed(() => new Map<number, Task>((query.data.value ?? [])
		.filter(task => task.id !== undefined)
		.map(task => [task.id!, task])))
}
