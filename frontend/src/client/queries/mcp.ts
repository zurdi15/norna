import {queryOptions} from '@tanstack/vue-query'

import {mcpInfo} from '@/client/generated'
import type {TokenPresets} from '@/client/generated'

import {normalizeTokenRoutes, type TokenPermissions} from './apiTokens'

/** Permissions by resource; the resource `*` stands for every one and `'*'` for every permission. */
export type PresetGroups = Record<string, string[] | '*'>

export interface McpSettings {
	endpoint: string
	// Only what the MCP tools can use, including mcp.access.
	routes: TokenPermissions
	presets: {
		readOnly: PresetGroups
		typed: PresetGroups
		full: PresetGroups
	}
}

export const mcpKeys = {
	info: ['mcp-info'] as const,
}

function presetGroups(groups: Record<string, string[] | string | null> | undefined): PresetGroups {
	return Object.fromEntries(Object.entries(groups ?? {}).map(([group, permissions]) => [
		group,
		permissions === '*' ? '*' : Array.isArray(permissions) ? permissions : [],
	]))
}

export function toMcpSettings({endpoint, routes, presets}: {endpoint?: string, routes?: Parameters<typeof normalizeTokenRoutes>[0], presets?: TokenPresets}): McpSettings {
	return {
		endpoint: endpoint ?? '',
		routes: normalizeTokenRoutes(routes),
		presets: {
			readOnly: presetGroups(presets?.read_only),
			typed: presetGroups(presets?.typed),
			full: presetGroups(presets?.full),
		},
	}
}

export function mcpSettingsQuery() {
	return queryOptions({
		queryKey: mcpKeys.info,
		queryFn: async ({signal}) => toMcpSettings((await mcpInfo({signal})).data),
		// Follows the server's configuration, which rarely changes.
		staleTime: 5 * 60 * 1000,
	})
}
