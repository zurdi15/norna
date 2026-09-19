import {queryOptions, useMutation} from '@tanstack/vue-query'

import {userAvatarUpload, userGetAvatarProvider, userSetAvatarProvider} from '@/client/generated'

import {contextMutationOptions} from './contextMutation'

/** Where the avatar comes from. ldap and openid are synced from the sign-in provider. */
export type AvatarProvider = 'default' | 'initials' | 'gravatar' | 'marble' | 'upload' | 'ldap' | 'openid'

export const avatarKeys = {
	provider: ['avatar', 'provider'] as const,
}

export function avatarProviderQuery() {
	return queryOptions({
		queryKey: avatarKeys.provider,
		queryFn: async ({signal}) => ((await userGetAvatarProvider({signal})).data.avatar_provider || 'default') as AvatarProvider,
	})
}

export function setAvatarProviderMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (provider: AvatarProvider) => {
			await userSetAvatarProvider({body: {avatar_provider: provider}})
		},
		optimistic: {
			queryKeys: () => [avatarKeys.provider],
			update: (provider, client) => client.setQueryData(avatarKeys.provider, provider),
		},
		onSettled: (_provider, client) => client.invalidateQueries({queryKey: avatarKeys.provider}),
	})
}

/** Uploads a picture; the server switches the provider to "upload". */
export function uploadAvatarMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (avatar: Blob) => {
			await userAvatarUpload({body: {avatar}})
		},
		onSuccess: (_data, _avatar, client) => client.setQueryData(avatarKeys.provider, 'upload'),
		onSettled: (_avatar, client) => client.invalidateQueries({queryKey: avatarKeys.provider}),
	})
}

export const useSetAvatarProviderMutation = () => useMutation(setAvatarProviderMutationOptions())
export const useUploadAvatarMutation = () => useMutation(uploadAvatarMutationOptions())
