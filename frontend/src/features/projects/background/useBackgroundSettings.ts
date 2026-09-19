import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useInfiniteQuery, useQuery} from '@tanstack/vue-query'

import type {Image} from '@/client/generated'
import {unsplashAuthor, unsplashBackgroundSearchQuery} from '@/client/queries/projectBackgrounds'
import {projectQuery} from '@/client/queries/projects'
import {useProjectBackground} from '@/composables/useProjectBackground'

export type UnsplashImage = Image & {id: string}

function unsplashIdOf(info: unknown): string | null {
	return typeof info === 'object' && info !== null && 'unsplash_id' in info && typeof info.unsplash_id === 'string'
		? info.unsplash_id
		: null
}

/**
 * The project as the server has it now: the preview must follow every change made
 * here, so this reads the live detail query rather than a snapshot.
 */
export function useBackgroundSettings(projectId: MaybeRefOrGetter<number>) {
	const query = useQuery(computed(() => ({...projectQuery(toValue(projectId)), enabled: toValue(projectId) > 0})))
	const project = computed(() => query.data.value ?? null)
	const {background, blurHashUrl} = useProjectBackground(project)

	return {
		project,
		isPending: query.isPending,
		hasBackground: computed(() => Boolean(project.value?.background_information)),
		background,
		blurHashUrl,
		credit: computed(() => unsplashAuthor(project.value?.background_information)),
		unsplashId: computed(() => unsplashIdOf(project.value?.background_information)),
	}
}

export function useUnsplashSearch(term: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
	const query = useInfiniteQuery(computed(() => ({
		...unsplashBackgroundSearchQuery(toValue(term)),
		enabled: toValue(enabled),
	})))
	return {
		...query,
		images: computed(() => (query.data.value?.pages.flat() ?? [])
			.filter((image): image is UnsplashImage => typeof image.id === 'string')),
	}
}

export function unsplashProfileUrl(author: string): string {
	return `https://unsplash.com/@${encodeURIComponent(author)}?utm_source=norna&utm_medium=referral`
}

export const UNSPLASH_URL = 'https://unsplash.com/?utm_source=norna&utm_medium=referral'
