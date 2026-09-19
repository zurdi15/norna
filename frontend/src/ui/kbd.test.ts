import {describe, expect, it} from 'vitest'

import {shortcutToKeycaps, shortcutToSteps} from './kbd'

describe('shortcutToKeycaps', () => {
	it('uses symbols for modifiers on Apple devices', () => {
		expect(shortcutToKeycaps('Mod+Shift+K', true)).toEqual(['⌘', '⇧', 'K'])
	})

	it('spells modifiers out elsewhere', () => {
		expect(shortcutToKeycaps('Mod+K', false)).toEqual(['Ctrl', 'K'])
	})

	it('reduces event.code names to the key label', () => {
		expect(shortcutToKeycaps('KeyT', false)).toEqual(['T'])
		expect(shortcutToKeycaps('Alt+Digit1', false)).toEqual(['Alt', '1'])
	})

	it('draws common named keys as glyphs', () => {
		expect(shortcutToKeycaps('Enter', true)).toEqual(['⏎'])
		expect(shortcutToKeycaps('Escape', false)).toEqual(['Esc'])
	})

	it('splits sequences into steps', () => {
		expect(shortcutToSteps('KeyG KeyO', false)).toEqual([['G'], ['O']])
		expect(shortcutToSteps('Mod+KeyK', true)).toEqual([['⌘', 'K']])
	})

	it('names punctuation keys by their symbol', () => {
		expect(shortcutToKeycaps('Shift+Slash', false)).toEqual(['Shift', '/'])
	})
})
