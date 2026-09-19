import {defineComponent, h, nextTick, type WritableComputedRef} from 'vue'
import {flushPromises, mount, enableAutoUnmount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createMemoryHistory, createRouter, RouterView, type RouteLocationNormalizedLoaded} from 'vue-router'

import {useDisplayedRouteQuery} from './useDisplayedRoute'

enableAutoUnmount(afterEach)

let search: WritableComputedRef<unknown, string | undefined>
let sort: WritableComputedRef<unknown, string | undefined>

const Page = defineComponent({
	setup() {
		search = useDisplayedRouteQuery('s')
		sort = useDisplayedRouteQuery('sort')
		return () => h('div')
	},
})

async function setup(start: string, behind?: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{path: '/list', component: Page},
			{path: '/tasks/:id', component: {render: () => h('aside')}},
		],
	})
	await router.push(start)
	const backdrop = behind ? router.resolve(behind) as RouteLocationNormalizedLoaded : undefined
	// The shell renders the page it was opened from while a task is open on top.
	mount(defineComponent({render: () => h(RouterView, {route: backdrop})}), {global: {plugins: [router]}})
	await flushPromises()
	return router
}

describe('useDisplayedRouteQuery', () => {
	it('reads and writes the current page', async () => {
		const router = await setup('/list?s=disks')
		const replace = vi.spyOn(router, 'replace')

		expect(search.value).toBe('disks')
		search.value = 'zfs'
		sort.value = 'title:asc'
		expect(search.value).toBe('zfs')
		await flushPromises()

		expect(replace).toHaveBeenCalledTimes(1)
		expect(router.currentRoute.value.fullPath).toBe('/list?s=zfs&sort=title:asc')
	})

	it('removes a parameter written as undefined', async () => {
		const router = await setup('/list?s=disks&sort=title:asc')

		search.value = undefined
		await flushPromises()

		expect(router.currentRoute.value.fullPath).toBe('/list?sort=title:asc')
	})

	it('reads the page behind an open task, not the task', async () => {
		await setup('/tasks/4', '/list?s=disks')

		expect(search.value).toBe('disks')
	})

	it('writing behind an open task goes back to the page', async () => {
		const router = await setup('/tasks/4', '/list?s=disks')

		search.value = 'zfs'
		await nextTick()
		await flushPromises()

		expect(router.currentRoute.value.fullPath).toBe('/list?s=zfs')
	})

	it('does not navigate for a value the url already has', async () => {
		const router = await setup('/list?s=disks')
		const replace = vi.spyOn(router, 'replace')

		search.value = 'disks'
		await flushPromises()

		expect(replace).not.toHaveBeenCalled()
		expect(search.value).toBe('disks')
	})
})
