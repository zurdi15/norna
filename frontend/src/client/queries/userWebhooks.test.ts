import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({
	userWebhooksList: vi.fn(),
	userWebhooksEvents: vi.fn(),
	userWebhooksCreate: vi.fn(),
	userWebhooksUpdate: vi.fn(),
	userWebhooksDelete: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {createWebhookDraft} from './projectWebhooks'
import {
	createUserWebhookMutationOptions,
	deleteUserWebhookMutationOptions,
	updateUserWebhookMutationOptions,
	userWebhookEventsQuery,
	userWebhookKeys,
	userWebhooksQuery,
} from './userWebhooks'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('user webhooks', () => {
	it('loads every page without credentials or the author (always the user)', async () => {
		sdk.userWebhooksList
			.mockResolvedValueOnce({data: {items: [{id: 1, target_url: 'https://a.test', events: ['task.overdue'], secret: 'leak', created_by: {id: 1}}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [{id: 2, target_url: 'https://b.test', events: null, basic_auth_password: 'leak'}], total_pages: 2}})
		const webhooks = await client.fetchQuery(userWebhooksQuery())
		expect(sdk.userWebhooksList).toHaveBeenNthCalledWith(2, {query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(webhooks.map(webhook => [webhook.id, webhook.events, webhook.created_by])).toEqual([[1, ['task.overdue'], undefined], [2, [], undefined]])
		expect(JSON.stringify(webhooks)).not.toContain('leak')
	})

	it('sorts the user-directed events and treats a null list as empty', async () => {
		sdk.userWebhooksEvents.mockResolvedValueOnce({data: ['tasks.overdue', 'task.reminder.fired', 'task.overdue']})
		expect(await client.fetchQuery(userWebhookEventsQuery())).toEqual(['task.overdue', 'task.reminder.fired', 'tasks.overdue'])

		sdk.userWebhooksEvents.mockResolvedValueOnce({data: null})
		expect(await new QueryClient().fetchQuery(userWebhookEventsQuery())).toEqual([])
	})

	it('creates with only the credentials that were filled in and forgets the input', async () => {
		client.setQueryData(userWebhookKeys.list, [])
		sdk.userWebhooksCreate.mockResolvedValue({data: {id: 1, target_url: 'https://hook.test', events: ['task.overdue'], secret: 'shh'}})
		const options = createUserWebhookMutationOptions()
		expect(options.gcTime).toBe(0)
		const webhook = {...createWebhookDraft(), target_url: ' https://hook.test ', events: ['task.overdue'], secret: 'shh', basic_auth_user: 'bot'}
		await client.getMutationCache().build(client, options).execute(webhook)
		expect(sdk.userWebhooksCreate).toHaveBeenCalledExactlyOnceWith({body: {target_url: 'https://hook.test', events: ['task.overdue'], secret: 'shh'}})
		expect(JSON.stringify(client.getQueryData(userWebhookKeys.list))).not.toContain('shh')
		expect(client.getQueryState(userWebhookKeys.list)?.isInvalidated).toBe(true)
	})

	it('updates the events of one webhook, sending its url along', async () => {
		client.setQueryData(userWebhookKeys.list, [{id: 1, target_url: 'https://a.test', events: ['task.overdue']}, {id: 2, events: ['task.overdue']}])
		sdk.userWebhooksUpdate.mockResolvedValue({data: {id: 1, target_url: 'https://a.test', events: ['task.overdue', 'tasks.overdue']}})
		await client.getMutationCache().build(client, updateUserWebhookMutationOptions()).execute({id: 1, target_url: 'https://a.test', events: ['task.overdue', 'tasks.overdue']})
		expect(sdk.userWebhooksUpdate).toHaveBeenCalledExactlyOnceWith({path: {webhook: 1}, body: {target_url: 'https://a.test', events: ['task.overdue', 'tasks.overdue']}})
		expect(client.getQueryData(userWebhookKeys.list)).toEqual([
			{id: 1, target_url: 'https://a.test', events: ['task.overdue', 'tasks.overdue']},
			{id: 2, events: ['task.overdue']},
		])
	})

	it('removes only the deleted webhook', async () => {
		client.setQueryData(userWebhookKeys.list, [{id: 1}, {id: 2}])
		sdk.userWebhooksDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, deleteUserWebhookMutationOptions()).execute(2)
		expect(sdk.userWebhooksDelete).toHaveBeenCalledExactlyOnceWith({path: {webhook: 2}})
		expect(client.getQueryData(userWebhookKeys.list)).toEqual([{id: 1}])
	})
})
