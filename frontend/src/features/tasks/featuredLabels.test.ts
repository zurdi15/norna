import {describe, expect, it} from 'vitest'

import type {Label} from '@/client/generated'

import {splitFeaturedLabels} from './featuredLabels'

const label = (id: number, title: string): Label => ({id, title, hex_color: ''})

describe('splitFeaturedLabels', () => {
	const fix = label(1, 'fix')
	const feat = label(2, 'feat')
	const home = label(3, 'home')

	it('puts the featured labels first, in the order they were marked, and keeps the rest', () => {
		expect(splitFeaturedLabels([home, fix, feat], [2, 1])).toEqual({featured: [feat, fix], others: [home]})
	})

	it('has none featured when none are marked', () => {
		expect(splitFeaturedLabels([home, fix], [])).toEqual({featured: [], others: [home, fix]})
	})
})
