import {computed} from 'vue'

import type {Label} from '@/client/generated'
import {useAuthStore} from '@/stores/auth'

/**
 * A task's type is one of the labels the user marked as a type in Settings: fix,
 * feature, core… It is picked when adding a task and shown as a chip before the title.
 */
export function splitTaskTypes(labels: readonly Label[], typeIds: readonly number[]): {types: Label[], others: Label[]} {
	const types = labels
		.filter(label => typeIds.includes(label.id ?? 0))
		.sort((a, b) => typeIds.indexOf(a.id ?? 0) - typeIds.indexOf(b.id ?? 0))
	return {
		types,
		others: labels.filter(label => !types.includes(label)),
	}
}

/** The ids of the type labels, in the order they were marked. */
export function useTaskTypeIds() {
	const authStore = useAuthStore()
	return computed(() => authStore.settings.frontend_settings.task_type_label_ids)
}
