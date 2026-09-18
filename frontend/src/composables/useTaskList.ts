import {computed, ref, shallowRef, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useRouter, isNavigationFailure} from 'vue-router'
import type {LocationQueryRaw} from 'vue-router'
import {hashKey, useInfiniteQuery, useQuery} from '@tanstack/vue-query'

import {
	TASKS_PER_PAGE,
	infiniteTaskListQuery,
	taskListQuery,
	type TaskExpand,
	type TaskListParams,
	type TaskListScope,
	type TaskPage,
} from '@/client/queries/tasks'
import {useDisplayedRoute, useDisplayedRouteQuery} from '@/composables/useDisplayedRoute'
import {useAuthStore} from '@/stores/auth'
import {useViewFiltersStore} from '@/stores/viewFilters'

export type Order = 'asc' | 'desc' | 'none'

export interface SortBy {
	id?: Order
	index?: Order
	done?: Order
	title?: Order
	priority?: Order
	due_date?: Order
	start_date?: Order
	end_date?: Order
	percent_done?: Order
	created?: Order
	updated?: Order
	done_at?: Order,
	position?: Order,
}

/** The filter part of a list. The search travels as `s` in the url and as `q` to the api. */
export interface TaskListFilters {
	filter: string
	filter_include_nulls: boolean
	q: string
}

const VALID_SORT_FIELDS = new Set<string>(
	['id', 'index', 'done', 'title', 'priority', 'due_date', 'start_date',
		'end_date', 'percent_done', 'created', 'updated', 'done_at', 'position'],
)

export function parseSortQuery(raw: string, fallback: SortBy): SortBy {
	const result: Record<string, Order> = {}
	for (const part of raw.split(',')) {
		const [field, order] = part.split(':')
		if (!field || !VALID_SORT_FIELDS.has(field)) continue
		if (order !== 'asc' && order !== 'desc') continue
		result[field] = order
	}
	return Object.keys(result).length > 0 ? result as SortBy : {...fallback}
}

export function serializeSortBy(sortBy: SortBy, defaultSort: SortBy): string | undefined {
	const keys = Object.keys(sortBy) as (keyof SortBy)[]
	const defaultKeys = Object.keys(defaultSort) as (keyof SortBy)[]
	const isDefault = keys.length === defaultKeys.length &&
		keys.every(k => sortBy[k] === defaultSort[k])
	if (isDefault) return undefined
	return keys.map(k => `${k}:${sortBy[k]}`).join(',')
}

const SORT_BY_DEFAULT: SortBy = {
	id: 'desc',
}

interface TaskListQueryState {
	sort: string | undefined
	filter: string | undefined
	s: string | undefined
	page: number
}

export function buildStoredQuery(state: TaskListQueryState): LocationQueryRaw {
	const query: LocationQueryRaw = {}
	if (state.sort) query.sort = state.sort
	if (state.filter) query.filter = state.filter
	if (state.s) query.s = state.s
	if (state.page > 1) query.page = String(state.page)
	return query
}

// An id sort always goes last: sorting by id first would make every other sort column pointless.
export function sortParams(sortBy: SortBy): Required<Pick<TaskListParams, 'sort_by' | 'order_by'>> {
	const fields = (Object.keys(sortBy) as (keyof SortBy)[]).filter(field => sortBy[field] && sortBy[field] !== 'none')
	const ordered = [...fields.filter(field => field !== 'id'), ...fields.filter(field => field === 'id')]
	return {
		sort_by: ordered,
		order_by: ordered.map(field => sortBy[field] as string),
	}
}

function queryString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined
}

export interface UseTaskListOptions {
	sortByDefault?: SortBy
	expand?: MaybeRefOrGetter<TaskExpand[]>
	perPage?: number
}

/**
 * A paginated task list whose sort, filter, search and page live in the url. For
 * a project view they are also remembered per view, and restored when a link
 * without them (the sidebar) opens the view again.
 */
// The url-bound part shared by the paged and the infinite list.
function useTaskListState(
	scopeGetter: MaybeRefOrGetter<TaskListScope>,
	options: UseTaskListOptions,
) {
	const sortByDefault = options.sortByDefault ?? SORT_BY_DEFAULT
	const scope = computed(() => toValue(scopeGetter))
	const storageViewId = computed(() => scope.value.kind === 'view' ? scope.value.viewId : undefined)

	const router = useRouter()
	const viewFiltersStore = useViewFiltersStore()
	const authStore = useAuthStore()

	const params = ref<TaskListFilters>({filter: '', filter_include_nulls: false, q: ''})

	// The page's own url: behind an open task the current route is the task's.
	const {isCurrent} = useDisplayedRoute()
	const pageQuery = useDisplayedRouteQuery('page')
	const page = computed<number>({
		get: () => Number(queryString(pageQuery.value) ?? '1'),
		set: value => pageQuery.value = value === 1 ? undefined : String(value),
	})
	const filter = useDisplayedRouteQuery('filter')
	const s = useDisplayedRouteQuery('s')
	const nulls = useDisplayedRouteQuery('nulls')

	watch(filter, v => { params.value.filter = queryString(v) ?? '' }, {immediate: true})
	watch(s, v => { params.value.q = queryString(v) ?? '' }, {immediate: true})

	watch(() => params.value.filter, v => { filter.value = v || undefined })
	watch(() => params.value.q, v => { s.value = v || undefined })
	watch(nulls, v => { params.value.filter_include_nulls = v === 'true' }, {immediate: true})

	const sortQuery = useDisplayedRouteQuery('sort')

	const sortBy = computed<SortBy>({
		get() {
			const raw = queryString(sortQuery.value)
			if (!raw) return {...sortByDefault}
			return parseSortQuery(raw, sortByDefault)
		},
		set(val: SortBy) {
			sortQuery.value = serializeSortBy(val, sortByDefault)
		},
	})

	const pendingQueryRestore = shallowRef<Promise<unknown>>()
	// Sidebar links omit the query, and project views are reused across navigation.
	let lastSyncedViewId: number | undefined
	watch(
		[storageViewId, sortQuery, filter, s, page],
		([viewId, sortValue, filterValue, sValue, pageValue]) => {
			if (viewId === undefined) {
				return
			}
			const viewIdChanged = viewId !== lastSyncedViewId
			lastSyncedViewId = viewId

			// An invalid `?page=` becomes NaN via `transform: Number`; treat it as
			// the default so it neither blocks restoration nor wipes stored state.
			const currentPage = Number.isInteger(pageValue) ? pageValue : 1
			const urlIsEmpty = !sortValue && !filterValue && !sValue && currentPage === 1
			if (viewIdChanged && urlIsEmpty) {
				const storedQuery = viewFiltersStore.getViewQuery(viewId)
				// Behind an open task the page shows the url it was opened from, as it is.
				if (Object.keys(storedQuery).length > 0 && !isCurrent.value) {
					return
				}
				if (Object.keys(storedQuery).length > 0) {
					const restore = router.replace({query: {...router.currentRoute.value.query, ...storedQuery}})
					pendingQueryRestore.value = restore
					restore
						.catch(failure => {
							if (!isNavigationFailure(failure)) throw failure
						})
						.finally(() => {
							if (pendingQueryRestore.value === restore) {
								pendingQueryRestore.value = undefined
							}
						})
					return
				}
			}

			const query = buildStoredQuery({
				sort: queryString(sortValue),
				filter: queryString(filterValue),
				s: queryString(sValue),
				page: currentPage,
			})
			if (Object.keys(query).length > 0) {
				viewFiltersStore.setViewQuery(viewId, query)
			} else {
				viewFiltersStore.clearViewQuery(viewId)
			}
		},
		{immediate: true},
	)

	watch(
		[params, sortBy, page],
		([, , newPage], [, , oldPage]) => {
			// A redundant page write can cancel the navigation restoring a saved sort.
			if (newPage === oldPage && newPage !== 1) {
				page.value = 1
			}
		},
		{deep: true},
	)

	const listParams = computed<TaskListParams>(() => ({
		...params.value,
		// Relevance ranking only engages when no sort is sent, so omit the default
		// sort while searching and let an explicit user sort still take precedence.
		...(params.value.q && !sortQuery.value ? {} : sortParams(sortBy.value)),
		filter_timezone: authStore.settings.timezone,
		expand: toValue(options.expand) ?? ['subtasks'],
		page: Number.isInteger(page.value) && page.value > 0 ? page.value : 1,
		per_page: options.perPage ?? TASKS_PER_PAGE,
	}))

	return {scope, params, sortBy, page, listParams, pendingQueryRestore}
}

export function useTaskList(
	scopeGetter: MaybeRefOrGetter<TaskListScope>,
	options: UseTaskListOptions = {},
) {
	const {scope, params, sortBy, page, listParams, pendingQueryRestore} = useTaskListState(scopeGetter, options)

	const query = useQuery(computed(() => {
		const listQuery = taskListQuery(scope.value, listParams.value)
		const scopeHash = hashKey([scope.value])
		return {
			...listQuery,
			enabled: listQuery.enabled !== false && !pendingQueryRestore.value,
			// Keep the page on screen while another page or sort of the same list loads, never another list's tasks.
			placeholderData: (previous: TaskPage | undefined, previousQuery?: {queryKey: readonly unknown[]}) =>
				previousQuery && hashKey([previousQuery.queryKey[2]]) === scopeHash ? previous : undefined,
		}
	}))

	return {
		tasks: computed(() => query.data.value?.items ?? []),
		totalPages: computed(() => query.data.value?.total_pages ?? 1),
		isPending: query.isPending,
		isFetching: query.isFetching,
		error: query.error,
		currentPage: page,
		params,
		sortByParam: sortBy,
		refetch: query.refetch,
	}
}

/**
 * The same list as useTaskList, loaded page after page into one growing list
 * (for phones and long lists). The url keeps sort, filter and search, not the page.
 */
export function useInfiniteTaskList(
	scopeGetter: MaybeRefOrGetter<TaskListScope>,
	options: UseTaskListOptions = {},
) {
	const {scope, params, sortBy, listParams, pendingQueryRestore} = useTaskListState(scopeGetter, options)

	const query = useInfiniteQuery(computed(() => {
		const {page: _page, ...rest} = listParams.value
		const infinite = infiniteTaskListQuery(scope.value, rest)
		return {
			...infinite,
			// infiniteQueryOptions' type drops `enabled`; the factory still sets it for unloadable scopes.
			enabled: (infinite as {enabled?: unknown}).enabled !== false && !pendingQueryRestore.value,
		}
	}))

	return {
		tasks: computed(() => (query.data.value?.pages ?? []).flatMap(page => page.items)),
		total: computed(() => query.data.value?.pages[0]?.total ?? 0),
		hasMore: query.hasNextPage,
		isLoadingMore: query.isFetchingNextPage,
		loadMore: () => query.fetchNextPage(),
		isPending: query.isPending,
		isFetching: query.isFetching,
		error: query.error,
		params,
		sortByParam: sortBy,
		refetch: query.refetch,
	}
}
