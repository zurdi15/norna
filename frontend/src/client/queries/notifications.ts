import {mutationOptions, queryOptions, useMutation} from '@tanstack/vue-query'
import type {QueryClient} from '@tanstack/vue-query'

import {
	notificationsList,
	notificationsMarkAllRead,
	notificationsMarkRead,
} from '@/client/generated'
import type {DatabaseNotification} from '@/client/generated'

export const notificationKeys = {
	all: ['notifications'] as const,
}

// The panel shows recent activity; older notifications aren't worth paging through.
const RECENT_NOTIFICATIONS = 50

export function notificationsQuery() {
	return queryOptions({
		queryKey: notificationKeys.all,
		queryFn: async () => (await notificationsList({query: {page: 1, per_page: RECENT_NOTIFICATIONS}})).data.items ?? [],
		staleTime: 60 * 1000,
	})
}

export function isUnread(notification: DatabaseNotification): boolean {
	return !notification.read_at
}

export function countUnread(notifications: DatabaseNotification[]): number {
	return notifications.filter(isUnread).length
}

async function snapshotNotifications(client: QueryClient) {
	await client.cancelQueries({queryKey: notificationKeys.all})
	return client.getQueryData<DatabaseNotification[]>(notificationKeys.all)
}

function restoreNotifications(client: QueryClient, previous: DatabaseNotification[] | undefined) {
	if (previous) {
		client.setQueryData(notificationKeys.all, previous)
	}
}

export interface MarkNotificationInput {
	id: number
	read: boolean
}

export function markNotificationMutationOptions() {
	return mutationOptions({
		mutationFn: async ({id, read}: MarkNotificationInput) => {
			const {data} = await notificationsMarkRead({path: {notificationid: id}, body: {read}})
			return data
		},
		onMutate: async ({id, read}, {client}) => {
			const previous = await snapshotNotifications(client)
			const readAt = read ? new Date().toISOString() : undefined
			client.setQueryData<DatabaseNotification[]>(notificationKeys.all, current =>
				current?.map(notification => notification.id === id ? {...notification, read_at: readAt} : notification),
			)
			return {previous}
		},
		onError: (_error, _input, context, {client}) => restoreNotifications(client, context?.previous),
		onSettled: (_data, _error, _input, _context, {client}) =>
			client.invalidateQueries({queryKey: notificationKeys.all}),
	})
}

export function markAllNotificationsReadMutationOptions() {
	return mutationOptions({
		mutationFn: async () => {
			await notificationsMarkAllRead()
		},
		onMutate: async (_input: void, {client}) => {
			const previous = await snapshotNotifications(client)
			const readAt = new Date().toISOString()
			client.setQueryData<DatabaseNotification[]>(notificationKeys.all, current =>
				current?.map(notification => notification.read_at ? notification : {...notification, read_at: readAt}),
			)
			return {previous}
		},
		onError: (_error, _input, context, {client}) => restoreNotifications(client, context?.previous),
		onSettled: (_data, _error, _input, _context, {client}) =>
			client.invalidateQueries({queryKey: notificationKeys.all}),
	})
}

export function useMarkNotificationMutation() {
	return useMutation(markNotificationMutationOptions())
}

export function useMarkAllNotificationsReadMutation() {
	return useMutation(markAllNotificationsReadMutationOptions())
}
