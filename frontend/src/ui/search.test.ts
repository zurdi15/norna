import {describe, expect, it} from 'vitest'

import {matchesSearch, normalizeForSearch} from './search'

describe('search normalization', () => {
	it('ignores case and accents', () => {
		expect(matchesSearch('Camión', 'camion')).toBe(true)
		expect(matchesSearch('diseño', 'DISENO')).toBe(true)
	})

	it('folds Nordic letters that do not decompose', () => {
		expect(normalizeForSearch('Tromsø Ærø Åland')).toBe('tromso aero aland')
	})

	it('matches everything for an empty query', () => {
		expect(matchesSearch('anything', '  ')).toBe(true)
	})

	it('does not match unrelated text', () => {
		expect(matchesSearch('Homelab', 'casa')).toBe(false)
	})
})
