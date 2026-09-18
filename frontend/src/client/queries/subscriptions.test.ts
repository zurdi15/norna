import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MutationOptions} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'

const sdk = vi.hoisted(() => ({
	subscriptionsCreate: vi.fn(),
	subscriptionsDelete: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {setTaskSubscriptionMutationOptions} from './subscriptions'
import {taskKeys} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

const subscription = {id: 3, entity: 'task' as const, entity_id: 5}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
})

describe('task subscriptions', () => {
	it('subscribes and stores the subscription on the task', async () => {
		queryClient.setQueryData(taskKeys.detail(5), {id: 5})
		sdk.subscriptionsCreate.mockResolvedValue({data: subscription})

		await run(setTaskSubscriptionMutationOptions(), {taskId: 5, subscribed: true})

		expect(sdk.subscriptionsCreate).toHaveBeenCalledWith({path: {entity: 'task', entityID: 5}})
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.subscription).toEqual(subscription)
		expect(message.success).toHaveBeenCalledWith({message: 'You are now subscribed to this task'})
	})

	it('unsubscribes and clears the subscription', async () => {
		queryClient.setQueryData(taskKeys.detail(5), {id: 5, subscription})
		sdk.subscriptionsDelete.mockResolvedValue({data: undefined})

		await run(setTaskSubscriptionMutationOptions(), {taskId: 5, subscribed: false})

		expect(sdk.subscriptionsDelete).toHaveBeenCalledWith({path: {entity: 'task', entityID: 5}})
		expect(queryClient.getQueryData<Task>(taskKeys.detail(5))?.subscription).toBeUndefined()
		expect(message.success).toHaveBeenCalledWith({message: 'You are now unsubscribed to this task'})
	})
})
