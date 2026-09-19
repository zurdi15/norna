import {computed, inject, shallowRef, watch} from 'vue'
import {routerViewLocationKey, useRoute, useRouter, type LocationQuery, type LocationQueryRaw} from 'vue-router'

import type {TaskListParams} from '@/client/queries/tasks'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {addDays, startOfDay} from '@/helpers/time/dateMath'

import {OPEN_END_DAYS} from './ganttBars'
import {formatKebabDate, rangeFromQuery, rangeToQuery, type GanttRange} from './ganttRange'
import type {ViewFilters} from '../useViewFilters'

export interface GanttFilters {
	range: GanttRange
	showTasksWithoutDates: boolean
}

// Large pages: the chart shows every task of its range at once and loads any further page right away.
export const GANTT_PAGE_SIZE = 250

export function ganttFiltersFromQuery(query: LocationQuery, now: Date): GanttFilters {
	return {
		range: rangeFromQuery(query, now),
		showTasksWithoutDates: query.showTasksWithoutDates === 'true',
	}
}

export function ganttFiltersToQuery(filters: GanttFilters, now: Date): Record<string, string | undefined> {
	return {
		...rangeToQuery(filters.range, now),
		showTasksWithoutDates: filters.showTasksWithoutDates ? 'true' : undefined,
	}
}

/**
 * The api filter for tasks whose dates reach into the range. It asks for a few days more
 * on each side, where open-ended bars fade in from; the rows then trim to the range.
 */
export function ganttRangeFilter(range: GanttRange): string {
	const from = `"${formatKebabDate(addDays(range.from, -OPEN_END_DAYS))}"`
	const until = `"${formatKebabDate(addDays(range.to, OPEN_END_DAYS + 1))}"`
	return [
		`(start_date >= ${from} && start_date < ${until})`,
		`(end_date >= ${from} && end_date < ${until})`,
		`(due_date >= ${from} && due_date < ${until})`,
		`(start_date < ${until} && end_date >= ${from})`,
		`(start_date < ${until} && due_date >= ${from})`,
	].join(' || ')
}

export interface GanttTaskParamsOptions {
	timezone?: string
	/** Off for the Favorites pseudo project, whose tasks come from many projects and can't nest. */
	subtasks: boolean
}

export function ganttTaskParams(filters: GanttFilters, view: ViewFilters, options: GanttTaskParamsOptions): TaskListParams {
	const range = `(${ganttRangeFilter(filters.range)})`
	return {
		q: view.q,
		filter: view.filter ? `${range} && (${view.filter})` : range,
		filter_timezone: options.timezone,
		// With nulls every comparison on a missing date passes; the rows sort out what to show.
		filter_include_nulls: filters.showTasksWithoutDates || view.filter_include_nulls,
		sort_by: ['start_date', 'id'],
		order_by: ['asc', 'asc'],
		expand: options.subtasks ? ['subtasks'] : [],
		per_page: GANTT_PAGE_SIZE,
	}
}

function withoutEmpty(query: Record<string, unknown>): LocationQueryRaw {
	return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as LocationQueryRaw
}

/**
 * The gantt's date range and "tasks without dates" toggle, kept in the url (dateFrom,
 * dateTo, showTasksWithoutDates) next to the page's search and filter.
 */
export function useGanttFilters() {
	const route = useRoute()
	const router = useRouter()
	// With a task open beside the chart the current route is the task, while the chart still
	// shows the route it was opened from; RouterView hands that one down.
	const shownRoute = inject(routerViewLocationKey, null)
	const displayed = computed(() => shownRoute?.value ?? route)
	const isCurrent = computed(() => displayed.value.fullPath === route.fullPath)

	const {now} = useGlobalNow()
	// The clock ticks every minute; the default range only moves once a day.
	const today = computed(() => startOfDay(now.value).getTime())

	// A change shows right away and holds until the url has it, so a second change made before
	// the navigation lands builds on the first. Behind an open task it waits for the chart's route.
	const pending = shallowRef<GanttFilters | null>(null)
	const fromRoute = computed(() => ganttFiltersFromQuery(displayed.value.query, new Date(today.value)))
	const filters = computed(() => pending.value ?? fromRoute.value)

	function write(next: GanttFilters) {
		pending.value = next
		if (!isCurrent.value) {
			return
		}
		void router.replace({
			query: withoutEmpty({...route.query, ...ganttFiltersToQuery(next, new Date(today.value))}),
		}).finally(() => {
			if (pending.value === next) {
				pending.value = null
			}
		})
	}

	watch(isCurrent, current => {
		if (current && pending.value) {
			write(pending.value)
		}
	})

	const range = computed<GanttRange>({
		get: () => filters.value.range,
		set: value => write({...filters.value, range: value}),
	})

	const showTasksWithoutDates = computed<boolean>({
		get: () => filters.value.showTasksWithoutDates,
		set: value => write({...filters.value, showTasksWithoutDates: value}),
	})

	return {filters, range, showTasksWithoutDates, today}
}
