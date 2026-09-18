import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {defineComponent, h, nextTick, shallowRef, type ShallowRef} from 'vue'
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter, RouterView, type RouteLocationNormalizedLoaded} from 'vue-router'

import {presetRange} from './ganttRange'
import {
	ganttFiltersFromQuery,
	ganttFiltersToQuery,
	ganttRangeFilter,
	ganttTaskParams,
	useGanttFilters,
} from './useGanttFilters'

enableAutoUnmount(afterEach)

const now = new Date(2026, 8, 18, 15, 30)
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date)

beforeEach(() => {
	vi.useFakeTimers({toFake: ['Date']})
	vi.setSystemTime(now)
})

afterEach(() => {
	vi.useRealTimers()
})

describe('url query', () => {
	it('reads the range and the toggle', () => {
		expect(ganttFiltersFromQuery({dateFrom: '2024-01-01', dateTo: '2024-02-01', showTasksWithoutDates: 'true'}, now))
			.toEqual({range: {from: day(2024, 1, 1), to: day(2024, 2, 1)}, showTasksWithoutDates: true})
	})

	it('falls back to the default range with the toggle off', () => {
		expect(ganttFiltersFromQuery({}, now))
			.toEqual({range: presetRange('next3Months', now), showTasksWithoutDates: false})
	})

	it('writes only what differs from the defaults', () => {
		expect(ganttFiltersToQuery({range: presetRange('next3Months', now), showTasksWithoutDates: false}, now))
			.toEqual({dateFrom: undefined, dateTo: undefined, showTasksWithoutDates: undefined})
		expect(ganttFiltersToQuery({range: presetRange('thisMonth', now), showTasksWithoutDates: true}, now))
			.toEqual({dateFrom: '2026-09-01', dateTo: '2026-09-30', showTasksWithoutDates: 'true'})
	})
})

describe('api params', () => {
	const filters = {range: {from: day(2026, 9, 1), to: day(2026, 9, 30)}, showTasksWithoutDates: false}
	const view = {filter: '', q: '', filter_include_nulls: false}

	it('asks for every task whose dates reach into the range, a few days wider for open-ended bars', () => {
		const filter = ganttRangeFilter(filters.range)
		expect(filter).toContain('(start_date >= "2026-08-27" && start_date < "2026-10-06")')
		expect(filter).toContain('(due_date >= "2026-08-27" && due_date < "2026-10-06")')
		expect(filter).toContain('(start_date < "2026-10-06" && end_date >= "2026-08-27")')
		expect(filter.split(' || ')).toHaveLength(5)
	})

	it('adds the page search and filter to the range', () => {
		const params = ganttTaskParams(filters, {filter: 'done = false', q: 'disk', filter_include_nulls: false}, {subtasks: true, timezone: 'Europe/Madrid'})
		expect(params.filter).toBe(`(${ganttRangeFilter(filters.range)}) && (done = false)`)
		expect(params).toMatchObject({q: 'disk', filter_timezone: 'Europe/Madrid', expand: ['subtasks'], filter_include_nulls: false})
	})

	it('includes tasks without dates when either asks for them', () => {
		expect(ganttTaskParams({...filters, showTasksWithoutDates: true}, view, {subtasks: true}).filter_include_nulls).toBe(true)
		expect(ganttTaskParams(filters, {...view, filter_include_nulls: true}, {subtasks: true}).filter_include_nulls).toBe(true)
	})

	it('does not nest where subtasks can\'t be expanded', () => {
		expect(ganttTaskParams(filters, view, {subtasks: false}).expand).toEqual([])
	})
})

describe('useGanttFilters', () => {
	let state: ReturnType<typeof useGanttFilters> | undefined

	const Page = defineComponent({
		setup() {
			state = useGanttFilters()
			return () => h('div')
		},
	})

	async function mountAt(path: string, backdrop?: ShallowRef<RouteLocationNormalizedLoaded | null>) {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{path: '/projects/:projectId/:viewId', name: 'project.view', component: Page},
				{path: '/tasks/:id', name: 'task.detail', component: {render: () => h('p')}},
			],
		})
		await router.push(path)
		await router.isReady()
		// Like the app shell: with a task open, the page behind renders the route it was opened from.
		const App = defineComponent({
			setup: () => () => h(RouterView, {route: backdrop?.value ?? undefined}),
		})
		mount(App, {global: {plugins: [router]}})
		await flushPromises()
		return router
	}

	beforeEach(() => {
		state = undefined
	})

	it('reads the range from the url', async () => {
		await mountAt('/projects/2/6?dateFrom=2024-01-01&dateTo=2024-02-01')
		expect(state!.range.value).toEqual({from: day(2024, 1, 1), to: day(2024, 2, 1)})
		expect(state!.showTasksWithoutDates.value).toBe(false)
	})

	it('writes changes to the url next to the page\'s own keys', async () => {
		const router = await mountAt('/projects/2/6?filter=done+%3D+false&s=disk')

		state!.range.value = presetRange('thisMonth', now)
		await flushPromises()
		expect(router.currentRoute.value.query).toEqual({
			filter: 'done = false',
			s: 'disk',
			dateFrom: '2026-09-01',
			dateTo: '2026-09-30',
		})

		state!.showTasksWithoutDates.value = true
		state!.range.value = presetRange('next3Months', now)
		await flushPromises()
		expect(router.currentRoute.value.query).toEqual({filter: 'done = false', s: 'disk', showTasksWithoutDates: 'true'})
	})

	it('keeps its range behind an open task and saves changes made there once back', async () => {
		const backdrop = shallowRef<RouteLocationNormalizedLoaded | null>(null)
		const router = await mountAt('/projects/2/6?dateFrom=2026-09-01&dateTo=2026-09-30', backdrop)

		backdrop.value = {...router.currentRoute.value}
		await router.push('/tasks/11')
		await flushPromises()
		expect(state!.range.value).toEqual({from: day(2026, 9, 1), to: day(2026, 9, 30)})

		state!.range.value = presetRange('thisYear', now)
		await flushPromises()
		expect(router.currentRoute.value.fullPath).toBe('/tasks/11')
		expect(state!.range.value).toEqual(presetRange('thisYear', now))

		await router.push(backdrop.value.fullPath)
		backdrop.value = null
		await nextTick()
		await flushPromises()
		expect(router.currentRoute.value.query).toEqual({dateFrom: '2026-01-01', dateTo: '2026-12-31'})
	})
})
