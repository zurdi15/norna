import {computed, onScopeDispose} from 'vue'
import {useQuery, useQueryClient} from '@tanstack/vue-query'

import {activeTimerQuery, timeEntryKeys} from '@/client/queries/timeEntries'
import {useWebSocket} from '@/composables/useWebSocket'
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

const TIMER_EVENTS = ['timer.created', 'timer.updated', 'timer.deleted']

/**
 * Keeps time entries in step with the user's other devices while the caller is mounted:
 * the socket only says a timer changed, the live queries fetch what.
 */
export function useTimerEvents() {
	const client = useQueryClient()
	const {subscribe} = useWebSocket()
	// Subscribe acknowledgements carry no payload.
	const refresh = (message: {data?: unknown}) => {
		if (message.data != null) {
			void client.invalidateQueries({queryKey: timeEntryKeys.all})
		}
	}
	const unsubscribers = TIMER_EVENTS.map(event => subscribe(event, refresh))
	onScopeDispose(() => unsubscribers.forEach(unsubscribe => unsubscribe()))
}
