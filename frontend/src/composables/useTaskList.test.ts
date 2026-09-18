import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {defineComponent, h, nextTick} from 'vue'
import {mount, flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {setActivePinia, createPinia} from 'pinia'
import {createRouter, createMemoryHistory, RouterView, type Router} from 'vue-router'
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'

const sdk = vi.hoisted(() => ({
	projectViewTasksList: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)

import {useTaskList, buildStoredQuery, parseSortQuery, serializeSortBy, sortParams} from './useTaskList'
import {useViewFiltersStore} from '@/stores/viewFilters'

enableAutoUnmount(afterEach)

type ListRequest = {path: {project: number, view: number}, query: Record<string, unknown>}

function page(items: Task[] = []) {
	return {data: {items, page: 1, total: items.length, total_pages: 1}}
}

let queryClient: QueryClient

beforeEach(() => {
	localStorage.clear()
	setActivePinia(createPinia())
	// Every list counts as stale, so returning to a project requests it again like the app does after a minute.
	queryClient = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: 0}}})
	sdk.projectViewTasksList.mockReset()
	sdk.projectViewTasksList.mockResolvedValue(page())
})

function lastRequest(): ListRequest {
	return sdk.projectViewTasksList.mock.calls.at(-1)?.[0] as ListRequest
}

function lastRequestParams(): Record<string, unknown> {
	return lastRequest().query
}

describe('buildStoredQuery', () => {
	it('includes sort when set', () => {
		expect(buildStoredQuery({sort: 'due_date:asc', filter: undefined, s: undefined, page: 1}))
			.toEqual({sort: 'due_date:asc'})
	})

	it('includes filter and search when set', () => {
		expect(buildStoredQuery({sort: undefined, filter: 'done = false', s: 'foo', page: 1}))
			.toEqual({filter: 'done = false', s: 'foo'})
	})

	it('omits page when it equals the default of 1', () => {
		expect(buildStoredQuery({sort: 'id:desc', filter: undefined, s: undefined, page: 1}))
			.toEqual({sort: 'id:desc'})
	})

	it('includes page when greater than 1', () => {
		expect(buildStoredQuery({sort: undefined, filter: undefined, s: undefined, page: 3}))
			.toEqual({page: '3'})
	})

	it('returns an empty object when nothing is set', () => {
		expect(buildStoredQuery({sort: undefined, filter: undefined, s: undefined, page: 1}))
			.toEqual({})
	})

	it('skips empty strings', () => {
		expect(buildStoredQuery({sort: '', filter: '', s: '', page: 1}))
			.toEqual({})
	})
})

describe('sort query helpers', () => {
	it('parses valid fields and falls back on garbage', () => {
		expect(parseSortQuery('due_date:asc,title:desc', {id: 'desc'})).toEqual({due_date: 'asc', title: 'desc'})
		expect(parseSortQuery('evil:asc,title:sideways', {id: 'desc'})).toEqual({id: 'desc'})
	})

	it('leaves the default sort out of the url', () => {
		expect(serializeSortBy({id: 'desc'}, {id: 'desc'})).toBeUndefined()
		expect(serializeSortBy({due_date: 'asc', id: 'desc'}, {id: 'desc'})).toBe('due_date:asc,id:desc')
	})

	it('always sorts by id last', () => {
		expect(sortParams({id: 'desc', due_date: 'asc'})).toEqual({sort_by: ['due_date', 'id'], order_by: ['asc', 'desc']})
	})
})

async function mountTaskList(query: Record<string, string>): Promise<Router> {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{path: '/', name: 'home', component: {render: () => null}}],
	})
	await router.push({path: '/', query})
	await router.isReady()

	const TestComponent = defineComponent({
		setup() {
			useTaskList(() => ({kind: 'view', projectId: 1, viewId: 1}))
			return () => h('div')
		},
	})

	mount(TestComponent, {global: {plugins: [router, [VueQueryPlugin, {queryClient}]]}})
	await flushPromises()
	await nextTick()
	return router
}

describe('useTaskList sort handling for relevance ranking', () => {
	it('omits the sort while searching with the default sort so the backend ranks by relevance', async () => {
		await mountTaskList({s: 'find me'})

		const params = lastRequestParams()
		expect(params.q).toBe('find me')
		expect(params.sort_by).toBeUndefined()
		expect(params.order_by).toBeUndefined()
	})

	it('keeps an explicit user sort while searching so the user sort is respected', async () => {
		await mountTaskList({s: 'find me', sort: 'title:asc'})

		const params = lastRequestParams()
		expect(params.q).toBe('find me')
		expect(params.sort_by).toEqual(['title'])
		expect(params.order_by).toEqual(['asc'])
	})

	it('sends the default sort when not searching', async () => {
		await mountTaskList({})

		const params = lastRequestParams()
		expect(params.q).toBeUndefined()
		// id always sorts last so other sort columns take precedence.
		expect(params.sort_by).toEqual(['id'])
		expect(params.order_by).toEqual(['desc'])
	})

	it('requests the view on the v2 endpoint with the list defaults', async () => {
		await mountTaskList({filter: 'done = false'})

		expect(lastRequest().path).toEqual({project: 1, view: 1})
		expect(lastRequestParams()).toMatchObject({filter: 'done = false', expand: ['subtasks'], page: 1, per_page: 50})
	})
})

describe('useTaskList restoring stored query into the url', () => {
	it('writes the persisted sort into the url when the url has none', async () => {
		localStorage.setItem('viewFilters', JSON.stringify({1: {sort: 'due_date:asc'}}))

		const router = await mountTaskList({})
		await flushPromises()

		expect(sdk.projectViewTasksList).toHaveBeenCalledTimes(1)
		expect(router.currentRoute.value.query.sort).toBe('due_date:asc')
		expect(lastRequestParams().sort_by).toEqual(['due_date'])
	})

	it('keeps an explicit url sort over the persisted one', async () => {
		localStorage.setItem('viewFilters', JSON.stringify({1: {sort: 'due_date:asc'}}))

		const router = await mountTaskList({sort: 'title:desc'})

		expect(router.currentRoute.value.query.sort).toBe('title:desc')
	})
})

async function mountRoutedTaskList() {
	let taskList: ReturnType<typeof useTaskList>
	const List = defineComponent({
		props: {projectId: {type: Number, required: true}, viewId: {type: Number, required: true}},
		setup(props) {
			taskList = useTaskList(
				() => ({kind: 'view', projectId: props.projectId, viewId: props.viewId}),
				{sortByDefault: {position: 'asc'}},
			)
			return () => h('div')
		},
	})
	const View = defineComponent({
		props: {projectId: Number, viewId: Number},
		setup: props => () => h(List, {projectId: props.projectId!, viewId: props.viewId!}),
	})
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{
			path: '/projects/:projectId/:viewId',
			component: View,
			props: route => ({projectId: Number(route.params.projectId), viewId: Number(route.params.viewId)}),
		}],
	})
	await router.push('/projects/1/11')
	mount(defineComponent({render: () => h(RouterView)}), {global: {plugins: [router, [VueQueryPlugin, {queryClient}]]}})
	await flushPromises()
	return {router, taskList: taskList!}
}

describe('useTaskList navigation and pagination', () => {
	it.each([1, 3])('restores the sort and page %i when returning to a project', async (currentPage) => {
		const {router, taskList} = await mountRoutedTaskList()
		taskList.sortByParam.value = {due_date: 'asc'}
		await flushPromises()
		taskList.currentPage.value = currentPage
		await flushPromises()

		sdk.projectViewTasksList.mockClear()
		await router.push('/projects/2/21')
		await flushPromises()
		expect(sdk.projectViewTasksList.mock.calls).toEqual([[{
			path: {project: 2, view: 21},
			query: expect.objectContaining({sort_by: ['position'], order_by: ['asc'], page: 1}),
		}]])
		expect(taskList.sortByParam.value).toEqual({position: 'asc'})

		sdk.projectViewTasksList.mockClear()
		await router.push('/projects/1/11')
		await flushPromises()
		expect(sdk.projectViewTasksList.mock.calls).toEqual([[{
			path: {project: 1, view: 11},
			query: expect.objectContaining({sort_by: ['due_date'], order_by: ['asc'], page: currentPage}),
		}]])
		expect(router.currentRoute.value.query.sort).toBe('due_date:asc')
		expect(taskList.sortByParam.value).toEqual({due_date: 'asc'})
		expect(taskList.currentPage.value).toBe(currentPage)
		expect(lastRequestParams().sort_by).toEqual(['due_date'])
	})

	it('keeps an explicit sort when navigating to a project with a saved sort', async () => {
		const {router, taskList} = await mountRoutedTaskList()
		useViewFiltersStore().setViewQuery(21, {sort: 'due_date:asc'})

		await router.push('/projects/2/21?sort=title:desc')
		await flushPromises()
		expect(taskList.sortByParam.value).toEqual({title: 'desc'})
		expect(lastRequestParams().sort_by).toEqual(['title'])
	})

	it('ignores a response from a project the user has left', async () => {
		let resolveOld!: (value: unknown) => void
		let resolveCurrent!: (value: unknown) => void
		sdk.projectViewTasksList
			.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
			.mockImplementationOnce(() => new Promise(resolve => { resolveCurrent = resolve }))
		const {router, taskList} = await mountRoutedTaskList()

		await router.push('/projects/2/21')
		await flushPromises()
		expect(taskList.tasks.value).toEqual([])

		const currentTasks = [{id: 2, project_id: 2, title: 'Current project task'}]
		resolveCurrent(page(currentTasks))
		await flushPromises()
		expect(taskList.tasks.value).toEqual(currentTasks)

		resolveOld(page([{id: 1, project_id: 1, title: 'Previous project task'}]))
		await flushPromises()
		expect(taskList.tasks.value).toEqual(currentTasks)
	})

	it('never shows the previous project while another one loads', async () => {
		sdk.projectViewTasksList.mockResolvedValueOnce(page([{id: 1, title: 'Previous project task'}]))
		const {router, taskList} = await mountRoutedTaskList()
		expect(taskList.tasks.value).toHaveLength(1)

		sdk.projectViewTasksList.mockImplementationOnce(() => new Promise(() => {}))
		await router.push('/projects/2/21')
		await flushPromises()

		expect(taskList.tasks.value).toEqual([])
	})

	it('keeps the current page on screen while the next page of the same list loads', async () => {
		const firstPage = [{id: 1, title: 'First page task'}]
		sdk.projectViewTasksList.mockResolvedValueOnce(page(firstPage))
		const {taskList} = await mountRoutedTaskList()
		expect(taskList.tasks.value).toEqual(firstPage)

		sdk.projectViewTasksList.mockImplementationOnce(() => new Promise(() => {}))
		taskList.currentPage.value = 2
		await flushPromises()

		expect(lastRequestParams().page).toBe(2)
		expect(taskList.tasks.value).toEqual(firstPage)
	})

	it('resets pagination when the user changes the sort', async () => {
		const {taskList} = await mountRoutedTaskList()
		taskList.currentPage.value = 3
		await flushPromises()
		expect(taskList.currentPage.value).toBe(3)

		taskList.sortByParam.value = {due_date: 'asc'}
		await flushPromises()
		expect(taskList.currentPage.value).toBe(1)
		expect(lastRequestParams().sort_by).toEqual(['due_date'])
	})
})
