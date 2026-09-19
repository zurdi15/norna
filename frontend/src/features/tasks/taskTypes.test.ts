import {describe, expect, it} from 'vitest'

import type {Label} from '@/client/generated'

import {splitTaskTypes} from './taskTypes'

const label = (id: number, title: string): Label => ({id, title, hex_color: ''})

describe('splitTaskTypes', () => {
	const fix = label(1, 'fix')
	const feat = label(2, 'feat')
	const home = label(3, 'home')

	it('puts the type labels first, in the order they were marked, and keeps the rest', () => {
		expect(splitTaskTypes([home, fix, feat], [2, 1])).toEqual({types: [feat, fix], others: [home]})
	})

	it('has no types when none are marked', () => {
		expect(splitTaskTypes([home, fix], [])).toEqual({types: [], others: [home, fix]})
	})
})
