import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	notificationsList: vi.fn(),
	notificationsMarkRead: vi.fn(),
	notificationsMarkAllRead: vi.fn(),
}))

vi.mock('@/client/generated', () => sdk)

import {
	countUnread,
	markAllNotificationsReadMutationOptions,
	markNotificationMutationOptions,
	notificationKeys,
	notificationsQuery,
} from './notifications'
import type {DatabaseNotification} from '@/client/generated'

const unread: DatabaseNotification = {id: 1, name: 'task.comment'}
const read: DatabaseNotification = {id: 2, name: 'task.assigned', read_at: '2026-09-01T10:00:00Z'}

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

describe('notifications', () => {
	beforeEach(() => {
		queryClient.clear()
		Object.values(sdk).forEach(mock => mock.mockReset())
	})

	it('loads the most recent page only', async () => {
		sdk.notificationsList.mockResolvedValue({data: {items: [unread, read], total_pages: 3}})

		const result = await queryClient.fetchQuery(notificationsQuery())

		expect(result).toEqual([unread, read])
		expect(sdk.notificationsList).toHaveBeenCalledExactlyOnceWith({query: {page: 1, per_page: 50}})
	})

	it('counts notifications without a read date as unread', () => {
		expect(countUnread([unread, read])).toBe(1)
	})

	it('marks one notification read before the request returns', async () => {
		queryClient.setQueryData(notificationKeys.all, [unread, read])
		sdk.notificationsList.mockResolvedValue({data: {items: [], total_pages: 1}})
		sdk.notificationsMarkRead.mockImplementation(async () => {
			const cached = queryClient.getQueryData<DatabaseNotification[]>(notificationKeys.all)
			expect(cached?.[0]?.read_at).toBeTruthy()
			return {data: {}}
		})

		await run(markNotificationMutationOptions(), {id: 1, read: true})

		expect(sdk.notificationsMarkRead).toHaveBeenCalledWith({path: {notificationid: 1}, body: {read: true}})
	})

	it('restores the list when marking fails', async () => {
		queryClient.setQueryData(notificationKeys.all, [unread, read])
		sdk.notificationsMarkRead.mockRejectedValue({status: 500})

		await expect(run(markNotificationMutationOptions(), {id: 2, read: false})).rejects.toEqual({status: 500})

		expect(queryClient.getQueryData(notificationKeys.all)).toEqual([unread, read])
	})

	it('marks every unread notification read and leaves read ones alone', async () => {
		queryClient.setQueryData(notificationKeys.all, [unread, read])
		sdk.notificationsMarkAllRead.mockImplementation(async () => {
			const cached = queryClient.getQueryData<DatabaseNotification[]>(notificationKeys.all)
			expect(cached?.[0]?.read_at).toBeTruthy()
			expect(cached?.[1]?.read_at).toBe(read.read_at)
			return {data: {}}
		})
		sdk.notificationsList.mockResolvedValue({data: {items: [], total_pages: 1}})

		await run(markAllNotificationsReadMutationOptions(), undefined)

		expect(sdk.notificationsMarkAllRead).toHaveBeenCalledOnce()
	})
})
