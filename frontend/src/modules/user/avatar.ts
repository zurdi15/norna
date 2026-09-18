import {nextTick, reactive} from 'vue'

import {avatarGet} from '@/client/generated'

const avatarCache = new Map<string, string>()
const pendingRequests = new Map<string, Promise<string>>()

// Bumped on invalidation so components rendering that user's cached avatar refetch it.
export const avatarCacheVersions = reactive(new Map<string, number>())

// Avatars need the auth header, so they are fetched as blobs and shown through object URLs.
// Returns undefined, never '': Vue renders src="" which the browser resolves to the page URL.
export async function fetchAvatarBlobUrl(username: string | undefined, size = 64): Promise<string | undefined> {
	if (!username) {
		return undefined
	}
	const key = `${username}-${size}`

	const cached = avatarCache.get(key)
	if (cached) {
		return cached
	}

	const pending = pendingRequests.get(key)
	if (pending) {
		return await pending
	}

	const request = avatarGet({path: {username}, query: {size}, parseAs: 'blob'})
		.then(({data}) => {
			const url = window.URL.createObjectURL(data as Blob)
			avatarCache.set(key, url)
			pendingRequests.delete(key)
			return url
		})
		.catch(error => {
			pendingRequests.delete(key)
			throw error
		})

	pendingRequests.set(key, request)
	return await request
}

export function invalidateAvatarCache(username: string | undefined) {
	if (!username) {
		return
	}

	const staleUrls: string[] = []
	for (const key of Array.from(avatarCache.keys())) {
		if (key.startsWith(`${username}-`)) {
			const url = avatarCache.get(key)
			if (url) {
				staleUrls.push(url)
			}
			avatarCache.delete(key)
		}
	}

	for (const key of Array.from(pendingRequests.keys())) {
		if (key.startsWith(`${username}-`)) {
			pendingRequests.delete(key)
		}
	}

	avatarCacheVersions.set(username, (avatarCacheVersions.get(username) ?? 0) + 1)

	// Only after the version bump rendered: revoking a url a live <img> still holds
	// breaks it on the next re-decode (print, content-visibility).
	void nextTick(() => staleUrls.forEach(url => window.URL.revokeObjectURL(url)))
}
