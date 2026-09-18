import {describe, expect, it} from 'vitest'

import {
	countPermissions,
	DEFAULT_PRESET_GROUPS,
	expandPreset,
	isFullAccess,
	mergePermissions,
	parseScopes,
	restrictToRoutes,
	samePermissions,
} from './tokenPermissions'

const routes = {
	labels: ['create', 'read_all', 'read_one'],
	tasks: ['create', 'read_all', 'read_one', 'update'],
	other: ['user'],
}

describe('token permissions', () => {
	it('expands "*" as every group and as every permission', () => {
		expect(expandPreset({'*': ['read_one', 'read_all']}, routes)).toEqual({labels: ['read_all', 'read_one'], tasks: ['read_all', 'read_one']})
		expect(expandPreset({'*': '*'}, routes)).toEqual(routes)
		expect(expandPreset({tasks: '*', labels: ['create']}, routes)).toEqual({labels: ['create'], tasks: routes.tasks})
	})

	it('skips groups and permissions the server doesn\'t offer', () => {
		expect(expandPreset(DEFAULT_PRESET_GROUPS.projects, routes)).toEqual({tasks: ['read_all', 'read_one']})
		expect(expandPreset({ghosts: '*', tasks: ['fly']}, routes)).toEqual({})
	})

	it('reads the scopes link parameter', () => {
		expect(parseScopes('feeds:access, tasks:create,tasks:create,broken,:x,y:')).toEqual({feeds: ['access'], tasks: ['create']})
		expect(parseScopes('')).toEqual({})
	})

	it('keeps the routes\' order and drops what they don\'t have', () => {
		expect(restrictToRoutes({tasks: ['update', 'create', 'fly'], other: [], nope: ['x']}, routes)).toEqual({tasks: ['create', 'update']})
	})

	it('merges, counts and compares selections', () => {
		const merged = mergePermissions({tasks: ['create']}, {tasks: ['create', 'update'], mcp: ['access']})
		expect(merged).toEqual({tasks: ['create', 'update'], mcp: ['access']})
		expect(countPermissions(merged)).toBe(3)
		expect(samePermissions({tasks: ['update', 'create']}, {tasks: ['create', 'update']})).toBe(true)
		expect(samePermissions({tasks: ['create']}, {tasks: ['create'], labels: ['create']})).toBe(false)
		expect(samePermissions({tasks: []}, {})).toBe(true)
	})

	it('tells full access apart from nearly full', () => {
		expect(isFullAccess(routes, routes)).toBe(true)
		expect(isFullAccess({...routes, other: []}, routes)).toBe(false)
		expect(isFullAccess({}, {})).toBe(false)
	})
})
