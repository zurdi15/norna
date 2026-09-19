import {computed} from 'vue'

import {useDisplayedRouteQuery} from '@/composables/useDisplayedRoute'

export interface ViewFilters {
	// In the api's format: labels, projects and people by id.
	filter: string
	q: string
	filter_include_nulls: boolean
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

/**
 * The search and filter of the view on screen. They live in the url (filter, s,
 * nulls) so any view can be linked as filtered; list and table read the same keys
 * through useTaskList, which also remembers them per view.
 */
export function useViewFilters() {
	// The page's own url, also while a task is open beside it.
	const filter = useDisplayedRouteQuery('filter')
	const search = useDisplayedRouteQuery('s')
	const nulls = useDisplayedRouteQuery('nulls')

	const filters = computed<ViewFilters>(() => ({
		filter: asString(filter.value),
		q: asString(search.value),
		filter_include_nulls: nulls.value === 'true',
	}))

	function update(next: Partial<ViewFilters>) {
		if (next.filter !== undefined) {
			filter.value = next.filter || undefined
		}
		if (next.q !== undefined) {
			search.value = next.q || undefined
		}
		if (next.filter_include_nulls !== undefined) {
			nulls.value = next.filter_include_nulls ? 'true' : undefined
		}
	}

	return {filters, update}
}
