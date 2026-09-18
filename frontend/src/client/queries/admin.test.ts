import {QueryClient, type InfiniteData} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({
	adminInviteLinksCreate: vi.fn(),
	adminInviteLinksDelete: vi.fn(),
	adminInviteLinksList: vi.fn(),
	adminOverview: vi.fn(),
	adminProjectsList: vi.fn(),
	adminProjectsPatchOwner: vi.fn(),
	adminTeamsList: vi.fn(),
	adminUsersCreate: vi.fn(),
	adminUsersDelete: vi.fn(),
	adminUsersList: vi.fn(),
	adminUsersPasswordResetEmail: vi.fn(),
	adminUsersPatchAdmin: vi.fn(),
	adminUsersPatchStatus: vi.fn(),
	adminUsersSetPassword: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {
	adminInviteLinksQuery,
	adminKeys,
	adminProjectsQuery,
	adminUsersQuery,
	changeProjectOwnerMutationOptions,
	createAdminUserMutationOptions,
	createInviteLinkMutationOptions,
	deleteAdminUserMutationOptions,
	deleteInviteLinkMutationOptions,
	nextAdminPage,
	setUserAdminMutationOptions,
	setUserPasswordMutationOptions,
	USER_STATUS,
	type AdminPage,
	type AdminProject,
	type AdminUserWithId,
} from './admin'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

function run<TInput>(options: object, input: TInput) {
	return client.getMutationCache().build(client, options).execute(input)
}

const userPages = (users: AdminUserWithId[]): InfiniteData<AdminPage<AdminUserWithId>, number> => ({
	pages: [{items: users, page: 1, totalPages: 1, total: users.length}],
	pageParams: [1],
})

describe('admin lists', () => {
	it('searches users page by page and drops rows without an id', async () => {
		sdk.adminUsersList.mockResolvedValueOnce({data: {items: [{id: 1, username: 'ana'}, {username: 'ghost'}], page: 1, total_pages: 2, total: 3}})
		const data = await client.fetchInfiniteQuery(adminUsersQuery(' ana '))

		expect(sdk.adminUsersList).toHaveBeenCalledWith({query: {q: 'ana', page: 1, per_page: 50}, signal: expect.any(AbortSignal)})
		expect(data.pages[0]).toEqual({items: [{id: 1, username: 'ana'}], page: 1, totalPages: 2, total: 3})
		expect(nextAdminPage(data.pages[0]!)).toBe(2)
	})

	it('leaves an empty search out of the request', async () => {
		sdk.adminProjectsList.mockResolvedValueOnce({data: {items: [], page: 1, total_pages: 1, total: 0}})
		const data = await client.fetchInfiniteQuery(adminProjectsQuery('  '))

		expect(sdk.adminProjectsList).toHaveBeenCalledWith({query: {page: 1, per_page: 50}, signal: expect.any(AbortSignal)})
		expect(nextAdminPage(data.pages[0]!)).toBeUndefined()
	})

	it('never keeps an invite token in the cache', async () => {
		sdk.adminInviteLinksList.mockResolvedValueOnce({data: {items: [{id: 1, name: 'Family', token: 'leak'}], total_pages: 1}})
		const links = await client.fetchQuery(adminInviteLinksQuery())

		expect(links).toEqual([{id: 1, name: 'Family'}])
	})
})

describe('admin user writes', () => {
	it('creates a user and forgets the password it was given', async () => {
		client.setQueryData(adminKeys.overview(), {users: 1})
		sdk.adminUsersCreate.mockResolvedValue({data: {id: 2, username: 'bo'}})
		const options = createAdminUserMutationOptions()
		expect(options.gcTime).toBe(0)

		await run(options, {username: 'bo', email: 'bo@example.com', password: 'secret-pass'})

		expect(sdk.adminUsersCreate).toHaveBeenCalledWith({body: {username: 'bo', email: 'bo@example.com', password: 'secret-pass'}})
		expect(client.getQueryState(adminKeys.overview())?.isInvalidated).toBe(true)
	})

	it('puts the updated account in every list it shows in', async () => {
		client.setQueryData(adminKeys.userList(''), userPages([{id: 1, username: 'ana', is_admin: false}, {id: 2, username: 'bo'}]))
		client.setQueryData(adminKeys.userList('an'), userPages([{id: 1, username: 'ana', is_admin: false}]))
		sdk.adminUsersPatchAdmin.mockResolvedValue({data: {id: 1, username: 'ana', is_admin: true}})

		await run(setUserAdminMutationOptions(), {id: 1, isAdmin: true})

		expect(sdk.adminUsersPatchAdmin).toHaveBeenCalledWith({path: {id: 1}, body: {is_admin: true}})
		for (const search of ['', 'an']) {
			const data = client.getQueryData<InfiniteData<AdminPage<AdminUserWithId>>>(adminKeys.userList(search))
			expect(data?.pages[0]?.items.find(user => user.id === 1)?.is_admin).toBe(true)
		}
	})

	it('sets a password without keeping it', async () => {
		sdk.adminUsersSetPassword.mockResolvedValue({data: {id: 1, username: 'ana'}})
		const options = setUserPasswordMutationOptions()
		expect(options.gcTime).toBe(0)

		await run(options, {id: 1, password: 'new-secret'})

		expect(sdk.adminUsersSetPassword).toHaveBeenCalledWith({path: {id: 1}, body: {new_password: 'new-secret'}})
	})

	it('removes a user deleted right away, and keeps one only scheduled for deletion', async () => {
		client.setQueryData(adminKeys.userList(''), userPages([{id: 1, username: 'ana'}, {id: 2, username: 'bo'}]))
		sdk.adminUsersDelete.mockResolvedValue({data: undefined})

		await run(deleteAdminUserMutationOptions(), {id: 2, username: 'bo', mode: 'scheduled'})
		expect(client.getQueryData<InfiniteData<AdminPage<AdminUserWithId>>>(adminKeys.userList(''))?.pages[0]?.items).toHaveLength(2)

		await run(deleteAdminUserMutationOptions(), {id: 2, username: 'bo', mode: 'now'})
		expect(sdk.adminUsersDelete).toHaveBeenLastCalledWith({path: {id: 2}, query: {mode: 'now'}})
		expect(client.getQueryData<InfiniteData<AdminPage<AdminUserWithId>>>(adminKeys.userList(''))?.pages[0]?.items.map(user => user.id)).toEqual([1])
	})

	it('knows the account states', () => {
		expect(USER_STATUS).toEqual({ACTIVE: 0, EMAIL_CONFIRMATION: 1, DISABLED: 2, LOCKED: 3})
	})
})

describe('admin project and invite writes', () => {
	it('shows the new owner in the project list', async () => {
		const pages: InfiniteData<AdminPage<AdminProject>, number> = {
			pages: [{items: [{id: 5, title: 'Garden', owner: {id: 1, username: 'ana'}}], page: 1, totalPages: 1, total: 1}],
			pageParams: [1],
		}
		client.setQueryData(adminKeys.projectList(''), pages)
		sdk.adminProjectsPatchOwner.mockResolvedValue({data: {id: 5, title: 'Garden', owner: {id: 2, username: 'bo'}}})

		await run(changeProjectOwnerMutationOptions(), {id: 5, ownerId: 2})

		expect(sdk.adminProjectsPatchOwner).toHaveBeenCalledWith({path: {id: 5}, body: {owner_id: 2}})
		const data = client.getQueryData<InfiniteData<AdminPage<AdminProject>>>(adminKeys.projectList(''))
		expect(data?.pages[0]?.items[0]?.owner?.username).toBe('bo')
	})

	it('hands the created link with its token to the caller only', async () => {
		client.setQueryData(adminKeys.inviteLinks(), [{id: 1, name: 'Old'}])
		sdk.adminInviteLinksCreate.mockResolvedValue({data: {id: 2, name: 'New', token: 'secret-token'}})
		const options = createInviteLinkMutationOptions()
		expect(options.gcTime).toBe(0)

		const created = await run(options, {name: 'New', max_uses: null, expires_at: null})

		expect(created).toEqual({id: 2, name: 'New', token: 'secret-token'})
		expect(JSON.stringify(client.getQueryData(adminKeys.inviteLinks()))).not.toContain('secret-token')
	})

	it('drops a deleted link at once and brings it back if the server says no', async () => {
		client.setQueryData(adminKeys.inviteLinks(), [{id: 1, name: 'A'}, {id: 2, name: 'B'}])
		sdk.adminInviteLinksDelete.mockRejectedValueOnce(new Error('nope'))

		await expect(run(deleteInviteLinkMutationOptions(), {id: 2})).rejects.toThrow('nope')
		expect(client.getQueryData(adminKeys.inviteLinks())).toEqual([{id: 1, name: 'A'}, {id: 2, name: 'B'}])

		sdk.adminInviteLinksDelete.mockResolvedValueOnce({data: undefined})
		await run(deleteInviteLinkMutationOptions(), {id: 2})
		expect(sdk.adminInviteLinksDelete).toHaveBeenLastCalledWith({path: {id: 2}})
	})
})
