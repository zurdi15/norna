import {describe, expect, it, vi} from 'vitest'
import {nextTick, ref} from 'vue'

import {useListNavigation} from './useListNavigation'

function setup(initial: string[], initialIndex?: () => number) {
	const items = ref(initial)
	const onSelect = vi.fn()
	const nav = useListNavigation({items, getKey: item => item, onSelect, idPrefix: 'list', initialIndex})
	return {items, onSelect, nav}
}

function press(key: string, target?: EventTarget) {
	const event = new KeyboardEvent('keydown', {key, cancelable: true})
	if (target) {
		Object.defineProperty(event, 'target', {value: target})
	}
	return event
}

describe('useListNavigation', () => {
	it('starts on the first item and points aria-activedescendant at it', () => {
		const {nav} = setup(['a', 'b'])
		expect(nav.activeItem.value).toBe('a')
		expect(nav.activeDescendant.value).toBe('list-a')
	})

	it('moves with the arrows and wraps around both ends', () => {
		const {nav} = setup(['a', 'b', 'c'])
		nav.onKeydown(press('ArrowUp'))
		expect(nav.activeItem.value).toBe('c')
		nav.onKeydown(press('ArrowDown'))
		expect(nav.activeItem.value).toBe('a')
		nav.onKeydown(press('ArrowDown'))
		expect(nav.activeItem.value).toBe('b')
	})

	it('selects the active item on Enter', () => {
		const {nav, onSelect} = setup(['a', 'b'])
		nav.onKeydown(press('ArrowDown'))
		const event = press('Enter')
		nav.onKeydown(event)
		expect(onSelect).toHaveBeenCalledWith('b')
		expect(event.defaultPrevented).toBe(true)
	})

	it('lets Enter through when the list is empty', () => {
		const {nav, onSelect} = setup([])
		const event = press('Enter')
		nav.onKeydown(event)
		expect(onSelect).not.toHaveBeenCalled()
		expect(event.defaultPrevented).toBe(false)
	})

	it('goes back to the top match when the list changes', async () => {
		const {items, nav} = setup(['a', 'b', 'c'])
		nav.onKeydown(press('ArrowDown'))
		nav.onKeydown(press('ArrowDown'))
		items.value = ['c', 'b']
		await nextTick()
		expect(nav.activeItem.value).toBe('c')
	})

	it('keeps the active item when the list is re-rendered with the same keys', async () => {
		const {items, nav} = setup(['a', 'b'])
		nav.onKeydown(press('ArrowDown'))
		items.value = ['a', 'b']
		await nextTick()
		expect(nav.activeItem.value).toBe('b')
	})

	it('starts on the given index and falls back to the first item when it is out of range', async () => {
		let wanted = 2
		const {items, nav} = setup(['a', 'b', 'c'], () => wanted)
		expect(nav.activeItem.value).toBe('c')
		wanted = -1
		items.value = ['x', 'y']
		await nextTick()
		expect(nav.activeItem.value).toBe('x')
	})

	it('jumps to the ends with Home and End outside a text box only', () => {
		const {nav} = setup(['a', 'b', 'c'])
		nav.onKeydown(press('End'))
		expect(nav.activeItem.value).toBe('c')
		nav.onKeydown(press('Home'))
		expect(nav.activeItem.value).toBe('a')

		const input = document.createElement('input')
		const event = press('End', input)
		nav.onKeydown(event)
		expect(nav.activeItem.value).toBe('a')
		expect(event.defaultPrevented).toBe(false)
	})

	it('ignores keys while an IME composition is running', () => {
		const {nav, onSelect} = setup(['a'])
		nav.onKeydown(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true}))
		expect(onSelect).not.toHaveBeenCalled()
	})
})
