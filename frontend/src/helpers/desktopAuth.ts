import type {OAuthTokens} from '@/types/desktop'

export function isDesktopApp(): boolean {
	return !!window.nornaDesktop?.isDesktop
}

export function startDesktopOAuthLogin(apiUrl: string): Promise<void> {
	return window.nornaDesktop!.startOAuthLogin(apiUrl)
}

export function listenForDesktopOAuthTokens(callback: (tokens: OAuthTokens) => void): void {
	window.nornaDesktop!.onOAuthTokens(callback)
}

export function listenForDesktopOAuthError(callback: (error: string) => void): void {
	window.nornaDesktop!.onOAuthError(callback)
}

export function refreshDesktopToken(apiUrl: string, refreshToken: string): Promise<OAuthTokens> {
	return window.nornaDesktop!.refreshToken(apiUrl, refreshToken)
}
