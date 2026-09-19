import {computed} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {countUnread, notificationsQuery} from '@/client/queries/notifications'

export function useNotifications() {
	const query = useQuery(notificationsQuery())
	const notifications = computed(() => query.data.value ?? [])

	return {
		notifications,
		unreadCount: computed(() => countUnread(notifications.value)),
		isPending: query.isPending,
		// For the websocket's notification.created: refetch the live query instead of writing the cache.
		refetch: query.refetch,
	}
}
