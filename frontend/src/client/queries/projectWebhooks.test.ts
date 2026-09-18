import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({webhooksList: vi.fn(), webhooksEventsList: vi.fn(), webhooksCreate: vi.fn(), webhooksUpdate: vi.fn(), webhooksDelete: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {
	createProjectWebhookMutationOptions,
	createWebhookDraft,
	deleteProjectWebhookMutationOptions,
	projectWebhookKeys,
	projectWebhooksQuery,
	updateProjectWebhookMutationOptions,
	webhookEventsQuery,
} from './projectWebhooks'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

describe('project webhooks', () => {
	it('loads every page of the project and keeps credentials out of the cache', async () => {
		sdk.webhooksList
			.mockResolvedValueOnce({data: {items: [{id: 1, target_url: 'https://a.test', events: ['task.created'], secret: 'leak'}], total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [{id: 2, target_url: 'https://b.test', events: null, basic_auth_password: 'leak'}], total_pages: 2}})
		const webhooks = await client.fetchQuery(projectWebhooksQuery(7))
		expect(sdk.webhooksList).toHaveBeenNthCalledWith(1, {path: {project: 7}, query: {page: 1, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(sdk.webhooksList).toHaveBeenNthCalledWith(2, {path: {project: 7}, query: {page: 2, per_page: 1000}, signal: expect.any(AbortSignal)})
		expect(webhooks.map(webhook => [webhook.id, webhook.events])).toEqual([[1, ['task.created']], [2, []]])
		expect(JSON.stringify(webhooks)).not.toContain('leak')
	})

	it('sorts the available events and treats a null list as empty', async () => {
		sdk.webhooksEventsList.mockResolvedValueOnce({data: ['task.updated', 'project.deleted', 'task.created']})
		expect(await client.fetchQuery(webhookEventsQuery())).toEqual(['project.deleted', 'task.created', 'task.updated'])

		const other = new QueryClient()
		sdk.webhooksEventsList.mockResolvedValueOnce({data: null})
		expect(await other.fetchQuery(webhookEventsQuery())).toEqual([])
	})

	it('creates with only the credentials that were filled in and forgets the input', async () => {
		client.setQueryData(projectWebhookKeys.list(7), [])
		client.setQueryData(projectWebhookKeys.list(8), [{id: 5}])
		sdk.webhooksCreate.mockResolvedValue({data: {id: 1, target_url: 'https://hook.test', events: ['task.created'], secret: 'shh', created_by: {id: 1}}})
		const options = createProjectWebhookMutationOptions()
		expect(options.gcTime).toBe(0)

		const webhook = {...createWebhookDraft(), target_url: ' https://hook.test ', events: ['task.created'], secret: 'shh', basic_auth_user: 'bot'}
		await client.getMutationCache().build(client, options).execute({projectId: 7, webhook})
		expect(sdk.webhooksCreate).toHaveBeenCalledExactlyOnceWith({path: {project: 7}, body: {target_url: 'https://hook.test', events: ['task.created'], secret: 'shh'}})
		expect(client.getQueryData(projectWebhookKeys.list(7))).toEqual([
			{id: 1, target_url: 'https://hook.test', events: ['task.created'], project_id: undefined, created_by: {id: 1}, created: undefined, updated: undefined},
		])
		expect(client.getQueryState(projectWebhookKeys.list(7))?.isInvalidated).toBe(true)
		expect(client.getQueryState(projectWebhookKeys.list(8))?.isInvalidated).toBe(false)
	})

	it('sends basic auth only when both the user and the password are set', async () => {
		sdk.webhooksCreate.mockResolvedValue({data: {id: 1}})
		const webhook = {...createWebhookDraft(), target_url: 'https://hook.test', events: ['task.created'], basic_auth_user: 'bot', basic_auth_password: 'pw'}
		await client.getMutationCache().build(client, createProjectWebhookMutationOptions()).execute({projectId: 7, webhook})
		expect(sdk.webhooksCreate.mock.calls[0]?.[0].body).toEqual({target_url: 'https://hook.test', events: ['task.created'], basic_auth_user: 'bot', basic_auth_password: 'pw'})
	})

	it('updates the events of one webhook, sending its url along', async () => {
		client.setQueryData(projectWebhookKeys.list(7), [
			{id: 1, target_url: 'https://a.test', events: ['task.created'], created_by: {id: 1}},
			{id: 2, target_url: 'https://b.test', events: ['task.created']},
		])
		sdk.webhooksUpdate.mockResolvedValue({data: {id: 1, target_url: 'https://a.test', events: ['task.deleted', 'task.updated']}})
		await client.getMutationCache().build(client, updateProjectWebhookMutationOptions()).execute({projectId: 7, id: 1, target_url: 'https://a.test', events: ['task.deleted', 'task.updated']})
		expect(sdk.webhooksUpdate).toHaveBeenCalledExactlyOnceWith({path: {project: 7, webhook: 1}, body: {target_url: 'https://a.test', events: ['task.deleted', 'task.updated']}})
		expect(client.getQueryData(projectWebhookKeys.list(7))).toEqual([
			{id: 1, target_url: 'https://a.test', events: ['task.deleted', 'task.updated'], created_by: {id: 1}},
			{id: 2, target_url: 'https://b.test', events: ['task.created']},
		])
		expect(client.getQueryState(projectWebhookKeys.list(7))?.isInvalidated).toBe(true)
	})

	it('removes only the deleted webhook', async () => {
		client.setQueryData(projectWebhookKeys.list(7), [{id: 1}, {id: 2}])
		sdk.webhooksDelete.mockResolvedValue({})
		await client.getMutationCache().build(client, deleteProjectWebhookMutationOptions()).execute({projectId: 7, id: 1})
		expect(sdk.webhooksDelete).toHaveBeenCalledExactlyOnceWith({path: {project: 7, webhook: 1}})
		expect(client.getQueryData(projectWebhookKeys.list(7))).toEqual([{id: 2}])
	})
})
