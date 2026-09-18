import {infiniteQueryOptions, queryOptions, useMutation, type InfiniteData, type QueryClient} from '@tanstack/vue-query'

import {
	adminInviteLinksCreate,
	adminInviteLinksDelete,
	adminInviteLinksList,
	adminOverview,
	adminProjectsList,
	adminProjectsPatchOwner,
	adminTeamsList,
	adminUsersCreate,
	adminUsersDelete,
	adminUsersList,
	adminUsersPasswordResetEmail,
	adminUsersPatchAdmin,
	adminUsersPatchStatus,
	adminUsersSetPassword,
} from '@/client/generated'
import type {
	AdminUser,
	CreateInviteLinkBodyWritable,
	CreateUserBodyWritable,
	Project,
	UserInviteLink,
} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'

// Everything here needs an instance admin; the server answers 404 to anyone else.
export const adminKeys = {
	all: ['admin'] as const,
	overview: () => ['admin', 'overview'] as const,
	users: () => ['admin', 'users'] as const,
	userList: (search: string) => ['admin', 'users', search] as const,
	projects: () => ['admin', 'projects'] as const,
	projectList: (search: string) => ['admin', 'projects', search] as const,
	inviteLinks: () => ['admin', 'invite-links'] as const,
	teams: (search: string) => ['admin', 'teams', search] as const,
}

/** The account states an admin can see and set. */
export const USER_STATUS = {
	ACTIVE: 0,
	EMAIL_CONFIRMATION: 1,
	DISABLED: 2,
	LOCKED: 3,
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

export type AdminUserWithId = AdminUser & {id: number}
export type AdminProject = Project & {id: number}

export interface AdminPage<T> {
	items: T[]
	page: number
	totalPages: number
	total: number
}

const ADMIN_PAGE_SIZE = 50

function hasId<T extends {id?: number}>(item: T): item is T & {id: number} {
	return typeof item.id === 'number'
}

function toPage<T extends {id?: number}>(data: {items?: T[] | null, page?: number, total_pages?: number, total?: number}): AdminPage<T & {id: number}> {
	return {
		items: (data.items ?? []).filter(hasId),
		page: data.page ?? 1,
		totalPages: data.total_pages ?? 1,
		total: data.total ?? 0,
	}
}

/** The page after the last one loaded, or none when that was the end. */
export const nextAdminPage = <T>(last: AdminPage<T>) => last.page < last.totalPages ? last.page + 1 : undefined

/** Only a non-empty search reaches the url. */
const searchQuery = (search: string) => search.trim() === '' ? {} : {q: search.trim()}

export function adminOverviewQuery() {
	return queryOptions({
		queryKey: adminKeys.overview(),
		queryFn: async ({signal}) => (await adminOverview({signal})).data,
	})
}

/** Every account, matched on username and email; pages load on demand. */
export function adminUsersQuery(search = '') {
	return infiniteQueryOptions({
		queryKey: adminKeys.userList(search.trim()),
		queryFn: async ({pageParam, signal}) => toPage((await adminUsersList({
			query: {...searchQuery(search), page: pageParam, per_page: ADMIN_PAGE_SIZE},
			signal,
		})).data),
		initialPageParam: 1,
		getNextPageParam: nextAdminPage,
	})
}

/** Every project on the instance, archived ones and other people's included. */
export function adminProjectsQuery(search = '') {
	return infiniteQueryOptions({
		queryKey: adminKeys.projectList(search.trim()),
		queryFn: async ({pageParam, signal}) => toPage((await adminProjectsList({
			query: {...searchQuery(search), page: pageParam, per_page: ADMIN_PAGE_SIZE},
			signal,
		})).data),
		initialPageParam: 1,
		getNextPageParam: nextAdminPage,
	})
}

// The token is only ever sent on creation, but nothing token-shaped may sit in a cache.
export function toInviteLink({token: _token, ...link}: UserInviteLink): UserInviteLink {
	return link
}

export function adminInviteLinksQuery() {
	return queryOptions({
		queryKey: adminKeys.inviteLinks(),
		queryFn: async ({signal}) => (await fetchAllPages(async page =>
			(await adminInviteLinksList({query: {page, per_page: ADMIN_PAGE_SIZE}, signal})).data)).map(toInviteLink),
	})
}

/** Local teams an invite can add people to, the admin's own or not. */
export function adminTeamsQuery(search = '') {
	return queryOptions({
		queryKey: adminKeys.teams(search.trim()),
		queryFn: async ({signal}) => (await adminTeamsList({
			query: {...searchQuery(search), per_page: ADMIN_PAGE_SIZE},
			signal,
		})).data.items ?? [],
	})
}

// --- Writes ------------------------------------------------------------------

type UserPages = InfiniteData<AdminPage<AdminUserWithId>, number>

function editUserPages(client: QueryClient, edit: (users: AdminUserWithId[]) => AdminUserWithId[]) {
	client.setQueriesData<UserPages>({queryKey: adminKeys.users()}, data => data && {
		...data,
		pages: data.pages.map(page => ({...page, items: edit(page.items)})),
	})
}

export function replaceAdminUser(client: QueryClient, user: AdminUser) {
	if (hasId(user)) {
		editUserPages(client, users => users.map(existing => existing.id === user.id ? user : existing))
	}
}

const invalidateUsers = (client: QueryClient) => Promise.all([
	client.invalidateQueries({queryKey: adminKeys.users()}),
	client.invalidateQueries({queryKey: adminKeys.overview()}),
])

export function createAdminUserMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (body: CreateUserBodyWritable) => (await adminUsersCreate({body})).data,
			onSettled: (_body, client) => invalidateUsers(client),
			successMessage: user => translate('admin.users.created', {username: user.username ?? ''}),
		}),
		// The input holds the new account's password.
		gcTime: 0,
	}
}

export function setUserAdminMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, isAdmin}: {id: number, isAdmin: boolean}) =>
			(await adminUsersPatchAdmin({path: {id}, body: {is_admin: isAdmin}})).data,
		onSuccess: (user, _input, client) => replaceAdminUser(client, user),
		onSettled: (_input, client) => invalidateUsers(client),
		successMessage: (user, {isAdmin}) => translate(isAdmin ? 'admin.users.madeAdmin' : 'admin.users.removedAdmin', {username: user.username ?? ''}),
	})
}

export function setUserStatusMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, status}: {id: number, status: UserStatus}) =>
			(await adminUsersPatchStatus({path: {id}, body: {status}})).data,
		onSuccess: (user, _input, client) => replaceAdminUser(client, user),
		onSettled: (_input, client) => invalidateUsers(client),
		successMessage: (user, {status}) => translate(status === USER_STATUS.DISABLED ? 'admin.users.disabled' : 'admin.users.enabled', {username: user.username ?? ''}),
	})
}

export function setUserPasswordMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async ({id, password}: {id: number, password: string}) =>
				(await adminUsersSetPassword({path: {id}, body: {new_password: password}})).data,
			onSuccess: (user, _input, client) => replaceAdminUser(client, user),
			successMessage: user => translate('admin.users.passwordSet', {username: user.username ?? ''}),
		}),
		// The input holds the new password.
		gcTime: 0,
	}
}

export function sendPasswordResetMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id}: {id: number, username: string}) => {
			await adminUsersPasswordResetEmail({path: {id}})
		},
		successMessage: (_data, {username}) => translate('admin.users.resetSent', {username}),
	})
}

export type DeleteUserMode = 'now' | 'scheduled'

export function deleteAdminUserMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, mode}: {id: number, username: string, mode: DeleteUserMode}) => {
			await adminUsersDelete({path: {id}, query: {mode}})
		},
		onSuccess: (_data, {id, mode}, client) => {
			if (mode === 'now') {
				editUserPages(client, users => users.filter(user => user.id !== id))
			}
		},
		onSettled: (_input, client) => invalidateUsers(client),
		successMessage: (_data, {username, mode}) => translate(mode === 'now' ? 'admin.users.deleted' : 'admin.users.deletionScheduled', {username}),
	})
}

type ProjectPages = InfiniteData<AdminPage<AdminProject>, number>

export function changeProjectOwnerMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, ownerId}: {id: number, ownerId: number}) =>
			(await adminProjectsPatchOwner({path: {id}, body: {owner_id: ownerId}})).data,
		onSuccess: (updated, {id}, client) => {
			client.setQueriesData<ProjectPages>({queryKey: adminKeys.projects()}, data => data && {
				...data,
				pages: data.pages.map(page => ({
					...page,
					items: page.items.map(project => project.id === id ? {...project, ...updated, id} : project),
				})),
			})
		},
		onSettled: (_input, client) => client.invalidateQueries({queryKey: adminKeys.projects()}),
		successMessage: updated => translate('admin.projects.ownerChanged', {title: updated.title ?? ''}),
	})
}

export function createInviteLinkMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (body: CreateInviteLinkBodyWritable) => (await adminInviteLinksCreate({body})).data,
			onSuccess: (link, _body, client) => {
				client.setQueryData<UserInviteLink[]>(adminKeys.inviteLinks(), current => current && [toInviteLink(link), ...current])
			},
			onSettled: (_body, client) => client.invalidateQueries({queryKey: adminKeys.inviteLinks()}),
		}),
		// The result holds the secret token: callers read it and reset the mutation.
		gcTime: 0,
	}
}

export function deleteInviteLinkMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id}: {id: number}) => {
			await adminInviteLinksDelete({path: {id}})
		},
		optimistic: {
			queryKeys: () => [adminKeys.inviteLinks()],
			update: ({id}, client) => {
				client.setQueryData<UserInviteLink[]>(adminKeys.inviteLinks(), current => current?.filter(link => link.id !== id))
			},
		},
		onSettled: (_input, client) => client.invalidateQueries({queryKey: adminKeys.inviteLinks()}),
		successMessage: () => translate('admin.invites.deleted'),
	})
}

export const useCreateAdminUserMutation = () => useMutation(createAdminUserMutationOptions())
export const useSetUserAdminMutation = () => useMutation(setUserAdminMutationOptions())
export const useSetUserStatusMutation = () => useMutation(setUserStatusMutationOptions())
export const useSetUserPasswordMutation = () => useMutation(setUserPasswordMutationOptions())
export const useSendPasswordResetMutation = () => useMutation(sendPasswordResetMutationOptions())
export const useDeleteAdminUserMutation = () => useMutation(deleteAdminUserMutationOptions())
export const useChangeProjectOwnerMutation = () => useMutation(changeProjectOwnerMutationOptions())
export const useCreateInviteLinkMutation = () => useMutation(createInviteLinkMutationOptions())
export const useDeleteInviteLinkMutation = () => useMutation(deleteInviteLinkMutationOptions())
