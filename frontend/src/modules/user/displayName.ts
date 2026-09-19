export function getDisplayName(user: {name?: string | null, username?: string | null} | null | undefined): string {
	return user?.name || user?.username || ''
}
