import {computed, defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {normalizeProject} from '@/client/queries/projects'

const useQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/vue-query', async importOriginal => ({
	...await importOriginal<typeof import('@tanstack/vue-query')>(),
	useQuery,
}))

import {useProject} from './useProject'

function mountProject(projectId: number) {
	let state: ReturnType<typeof useProject> | undefined
	const component = defineComponent({
		setup() {
			state = useProject(projectId)
			return () => h('div')
		},
	})
	const wrapper = mount(component)
	return {wrapper, state: computed(() => state!)}
}

describe('useProject', () => {
	beforeEach(() => {
		useQuery.mockReset()
	})

	it('shows the cached project, follows cache updates and loads once fetched fresh', async () => {
		const data = ref(normalizeProject({id: 1, title: 'Cached'}))
		const isFetching = ref(true)
		useQuery.mockReturnValue({data, isFetching, isError: ref(false), error: ref(null)})

		const {wrapper, state} = mountProject(1)
		expect(state.value.project.value.title).toBe('Cached')
		expect(state.value.isLoading.value).toBe(true)
		expect(state.value.isLoaded.value).toBe(false)

		data.value = normalizeProject({id: 1, title: 'Fresh'})
		isFetching.value = false
		await nextTick()
		expect(state.value.project.value.title).toBe('Fresh')
		expect(state.value.isLoaded.value).toBe(true)

		data.value = normalizeProject({id: 1, title: 'Renamed elsewhere'})
		await nextTick()
		expect(state.value.project.value.title).toBe('Renamed elsewhere')
		wrapper.unmount()
	})

	it('never shows another project while the current one loads', () => {
		useQuery.mockReturnValue({data: ref(normalizeProject({id: 2, title: 'Other'})), isFetching: ref(true), isError: ref(false), error: ref(null)})

		const {wrapper, state} = mountProject(1)
		expect(state.value.project.value).toMatchObject({id: 1, title: ''})
		wrapper.unmount()
	})

	it('settles the loading state when the detail query fails', async () => {
		const data = ref<ReturnType<typeof normalizeProject> | undefined>(undefined)
		const error = ref<Error | null>(null)
		const isError = ref(false)
		const isFetching = ref(true)
		useQuery.mockReturnValue({
			data,
			isFetching,
			isError,
			error,
		})

		const {wrapper, state} = mountProject(1)
		expect(state.value.isLoading.value).toBe(true)

		error.value = new Error('Not found')
		isError.value = true
		isFetching.value = false
		await nextTick()

		expect(state.value.isLoading.value).toBe(false)
		expect(state.value.error.value).toBe(error.value)
		expect(state.value.isLoaded.value).toBe(false)

		data.value = normalizeProject({id: 1, title: 'Recovered'})
		error.value = null
		isError.value = false
		await nextTick()

		expect(state.value.project.value.title).toBe('Recovered')
		expect(state.value.isLoaded.value).toBe(true)
		wrapper.unmount()
	})
})
