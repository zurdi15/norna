/**
 * Returns the API base URL (window.API_URL, pointing at /api/v1) with a trailing slash.
 */
export function getApiBaseUrl(): string {
	const url = window.API_URL
	return url?.endsWith('/') ? url : url + '/'
}

export function getApiV2BaseUrl(): string {
	return getApiBaseUrl().replace(/\/api\/v1\/$/, '/api/v2/')
}

// Absolute URL for an /api/v2 path, for the few requests made outside the generated client.
export function apiV2Url(path: string): string {
	return new URL(getApiV2BaseUrl() + path, window.location.origin).toString()
}
