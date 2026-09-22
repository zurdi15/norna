import {computed} from 'vue'

import type {Label} from '@/client/generated'
import {useAuthStore} from '@/stores/auth'

/**
 * Featured labels are the ones the user marked in Settings: fix, feat, chore, ui/ux…
 * They are picked with a tap when adding a task and lead a task wherever it shows up.
 */
export function splitFeaturedLabels(labels: readonly Label[], featuredIds: readonly number[]): {featured: Label[], others: Label[]} {
	const featured = labels
		.filter(label => featuredIds.includes(label.id ?? 0))
		.sort((a, b) => featuredIds.indexOf(a.id ?? 0) - featuredIds.indexOf(b.id ?? 0))
	return {
		featured,
		others: labels.filter(label => !featured.includes(label)),
	}
}

/** The ids of the featured labels, in the order they were marked. */
export function useFeaturedLabelIds() {
	const authStore = useAuthStore()
	return computed(() => authStore.settings.frontend_settings.featured_label_ids)
}
