import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import type {LinkSharing, TeamWithPermission, UserWithPermission} from '@/client/generated'
import {linkSharesQuery} from '@/client/queries/linkShares'
import {projectTeamSharesQuery, projectUserSharesQuery} from '@/client/queries/projectShares'

export type UserShare = UserWithPermission & {username: string}
export type TeamShare = TeamWithPermission & {id: number}
export type LinkShare = LinkSharing & {id: number, hash: string}

export function useProjectUserShares(projectId: MaybeRefOrGetter<number>) {
	const query = useQuery(computed(() => ({...projectUserSharesQuery(toValue(projectId)), enabled: toValue(projectId) > 0})))
	return {
		...query,
		shares: computed(() => (query.data.value ?? []).filter((share): share is UserShare => Boolean(share.username))),
	}
}

export function useProjectTeamShares(projectId: MaybeRefOrGetter<number>) {
	const query = useQuery(computed(() => ({...projectTeamSharesQuery(toValue(projectId)), enabled: toValue(projectId) > 0})))
	return {
		...query,
		shares: computed(() => (query.data.value ?? []).filter((share): share is TeamShare => typeof share.id === 'number')),
	}
}

export function useLinkShares(projectId: MaybeRefOrGetter<number>, enabled: MaybeRefOrGetter<boolean> = true) {
	const query = useQuery(computed(() => ({
		...linkSharesQuery(toValue(projectId)),
		enabled: toValue(enabled) && toValue(projectId) > 0,
	})))
	return {
		...query,
		shares: computed(() => (query.data.value ?? [])
			.filter((share): share is LinkShare => typeof share.id === 'number' && typeof share.hash === 'string')),
	}
}
