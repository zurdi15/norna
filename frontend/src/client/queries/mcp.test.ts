import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({mcpInfo: vi.fn()}))
vi.mock('@/client/generated', () => sdk)

import {mcpSettingsQuery, toMcpSettings} from './mcp'

beforeEach(() => {
	vi.resetAllMocks()
})

describe('mcp settings', () => {
	it('reads the endpoint, the usable permissions and the presets', async () => {
		sdk.mcpInfo.mockResolvedValueOnce({data: {
			endpoint: 'https://tasks.test/api/v2/mcp',
			routes: {mcp: {access: {}}, tasks: {update: {}, read_all: {}}},
			presets: {read_only: {'*': ['read_all']}, typed: {tasks: ['update']}, full: {'*': '*'}},
		}})
		expect(await new QueryClient().fetchQuery(mcpSettingsQuery())).toEqual({
			endpoint: 'https://tasks.test/api/v2/mcp',
			routes: {mcp: ['access'], tasks: ['read_all', 'update']},
			presets: {readOnly: {'*': ['read_all']}, typed: {tasks: ['update']}, full: {'*': '*'}},
		})
	})

	it.each([
		{},
		{presets: {typed: {tasks: null}, read_only: {tasks: null}, full: {'*': 'unexpected'}}},
	])('handles omitted settings and empty permission groups: %j', settings => {
		const result = toMcpSettings(settings)
		expect(result.endpoint).toBe('')
		expect(result.routes).toEqual({})
		for (const groups of Object.values(result.presets)) {
			expect(Object.values(groups).flat()).toEqual([])
		}
	})
})
