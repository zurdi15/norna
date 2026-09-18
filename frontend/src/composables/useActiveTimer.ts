import {computed} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {activeTimerQuery} from '@/client/queries/timeEntries'
import {useAuthStore} from '@/stores/auth'

export function useActiveTimer() {
	const authStore = useAuthStore()
	// Link shares can't track time.
	const userId = computed(() => authStore.authUser ? authStore.info?.id ?? 0 : 0)
	const query = useQuery(computed(() => activeTimerQuery(userId.value)))
	const activeTimer = computed(() => query.data.value ?? null)

	return {
		activeTimer,
		hasActiveTimer: computed(() => activeTimer.value !== null),
		isPending: query.isPending,
		// For the websocket's timer.* events: refetch the live query instead of writing the cache.
		refetch: query.refetch,
	}
}
