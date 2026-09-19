import type {TokenPermissions} from '@/client/queries/apiTokens'
import type {PresetGroups} from '@/client/queries/mcp'

export interface TokenPreset {
	id: string
	label: string
	groups: PresetGroups
}

/** The quick picks of the API tokens form, as the old form offered them. */
export const DEFAULT_PRESET_GROUPS: Record<'readOnly' | 'tasks' | 'projects' | 'fullAccess', PresetGroups> = {
	readOnly: {'*': ['read_one', 'read_all']},
	tasks: {
		tasks: '*',
		tasks_attachments: '*',
		tasks_assignees: '*',
		tasks_labels: '*',
		tasks_comments: '*',
		tasks_relations: '*',
		labels: ['read_one', 'read_all', 'create'],
		projects: ['read_one', 'read_all', 'views_buckets_tasks'],
		projects_views: ['read_one', 'read_all'],
		projects_views_tasks: ['read_one', 'read_all'],
	},
	projects: {
		projects: '*',
		projects_views: '*',
		projects_teams: '*',
		projects_users: '*',
		projects_shares: '*',
		projects_webhooks: '*',
		projects_buckets: '*',
		projects_views_tasks: '*',
		tasks: ['read_one', 'read_all'],
		teams: ['read_one', 'read_all'],
	},
	fullAccess: {'*': '*'},
}

/** Only what the routes offer, in their order, without empty groups. */
export function restrictToRoutes(permissions: TokenPermissions, routes: TokenPermissions): TokenPermissions {
	const result: TokenPermissions = {}
	for (const [group, available] of Object.entries(routes)) {
		const picked = available.filter(permission => permissions[group]?.includes(permission))
		if (picked.length) {
			result[group] = picked
		}
	}
	return result
}

export function mergePermissions(...sets: TokenPermissions[]): TokenPermissions {
	const result: TokenPermissions = {}
	for (const set of sets) {
		for (const [group, permissions] of Object.entries(set)) {
			result[group] = [...new Set([...(result[group] ?? []), ...permissions])]
		}
	}
	return result
}

/** Expands a preset against the routes: `*` as a group means every group, as permissions every permission. */
export function expandPreset(groups: PresetGroups, routes: TokenPermissions): TokenPermissions {
	const expanded: TokenPermissions = {}
	for (const [group, permissions] of Object.entries(groups)) {
		for (const target of group === '*' ? Object.keys(routes) : [group]) {
			const available = routes[target] ?? []
			expanded[target] = [...(expanded[target] ?? []), ...(permissions === '*' ? available : permissions)]
		}
	}
	return restrictToRoutes(expanded, routes)
}

/** Reads `tasks:create,feeds:access`, the form of the `scopes` link parameter. */
export function parseScopes(scopes: string): TokenPermissions {
	const result: TokenPermissions = {}
	for (const scope of scopes.split(',')) {
		const [group, permission] = scope.trim().split(':')
		if (group && permission) {
			result[group] = [...new Set([...(result[group] ?? []), permission])]
		}
	}
	return result
}

export function countPermissions(permissions: TokenPermissions): number {
	return Object.values(permissions).reduce((total, list) => total + list.length, 0)
}

export function samePermissions(a: TokenPermissions, b: TokenPermissions): boolean {
	const groups = new Set([...Object.keys(a), ...Object.keys(b)])
	return [...groups].every(group => {
		const left = a[group] ?? []
		const right = b[group] ?? []
		return left.length === right.length && left.every(permission => right.includes(permission))
	})
}

/** Every permission the routes offer: a token that can do anything. */
export function isFullAccess(permissions: TokenPermissions, routes: TokenPermissions): boolean {
	const groups = Object.entries(routes)
	return groups.length > 0 && groups.every(([group, available]) => available.every(permission => permissions[group]?.includes(permission)))
}
