import {describe, expect, it} from 'vitest'

import {acceleratorToShortcut, eventToAccelerator} from './accelerator'

const press = (code: string, key: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) =>
	({code, key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...modifiers})

describe('eventToAccelerator', () => {
	it('builds an accelerator from the physical key', () => {
		expect(eventToAccelerator(press('KeyA', 'a', {ctrlKey: true, shiftKey: true}))).toBe('CmdOrCtrl+Shift+A')
		// By position: the key labelled A on an AZERTY keyboard is the US Q.
		expect(eventToAccelerator(press('KeyQ', 'a', {metaKey: true}))).toBe('CmdOrCtrl+Q')
		expect(eventToAccelerator(press('Digit5', '%', {altKey: true, shiftKey: true}))).toBe('Alt+Shift+5')
		expect(eventToAccelerator(press('Space', ' ', {ctrlKey: true, altKey: true}))).toBe('CmdOrCtrl+Alt+Space')
		expect(eventToAccelerator(press('F12', 'F12', {shiftKey: true}))).toBe('Shift+F12')
		expect(eventToAccelerator(press('ArrowUp', 'ArrowUp', {ctrlKey: true}))).toBe('CmdOrCtrl+Up')
	})

	it('waits while only modifiers are down', () => {
		expect(eventToAccelerator(press('ShiftLeft', 'Shift', {shiftKey: true}))).toBeNull()
		expect(eventToAccelerator(press('ControlLeft', 'Control', {ctrlKey: true}))).toBeNull()
	})

	it('needs a modifier and a known key', () => {
		expect(eventToAccelerator(press('KeyA', 'a'))).toBeNull()
		expect(eventToAccelerator(press('IntlBackslash', '<', {ctrlKey: true}))).toBeNull()
	})
})

describe('acceleratorToShortcut', () => {
	it('speaks the notation of the keycaps', () => {
		expect(acceleratorToShortcut('CmdOrCtrl+Shift+A')).toBe('Mod+Shift+A')
		expect(acceleratorToShortcut('Alt+Up')).toBe('Alt+ArrowUp')
	})
})
