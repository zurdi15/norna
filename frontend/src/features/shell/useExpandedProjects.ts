import {createSharedComposable, useStorage} from '@vueuse/core'

// Which project branches are open in the sidebar tree, remembered per device.
export const useExpandedProjects = createSharedComposable(() => {
	const expanded = useStorage<number[]>('norna:sidebar-expanded', [])

	return {
		isExpanded: (id: number) => expanded.value.includes(id),
		toggle: (id: number) => {
			expanded.value = expanded.value.includes(id)
				? expanded.value.filter(existing => existing !== id)
				: [...expanded.value, id]
		},
	}
})
