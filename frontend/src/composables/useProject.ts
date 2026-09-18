import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {
	normalizeProject,
	projectQuery,
} from '@/client/queries/projects'

/**
 * One project, live from the cache: edits made anywhere show up at once. Until a
 * response for the current id is cached it's an empty project with that id, so a
 * switch never shows the previous one. `isLoaded` turns true once this id has been
 * fetched fresh, which is when forms should copy it into their drafts.
 */
export function useProject(projectId: MaybeRefOrGetter<number>) {
	const id = computed(() => Number(toValue(projectId)))
	const query = useQuery(computed(() => projectQuery(id.value)))
	const loadedProjectId = ref(0)

	watch([id, query.data, query.isFetching], ([current, value, isFetching]) => {
		if (!isFetching && value?.id === current) {
			loadedProjectId.value = current
		}
	}, {immediate: true})

	const project = computed(() => {
		const value = query.data.value
		return value?.id === id.value ? value : normalizeProject({id: id.value})
	})

	return {
		project,
		isLoading: computed(() =>
			query.isFetching.value ||
			(!query.isError.value && loadedProjectId.value !== id.value),
		),
		error: query.error,
		isLoaded: computed(() => loadedProjectId.value > 0 && loadedProjectId.value === id.value),
	}
}
