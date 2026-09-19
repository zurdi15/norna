import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {effectScope} from 'vue'

import {
	applyBarEdit,
	daysBetween,
	dragBarEdit,
	keyboardBarEdit,
	snapToDays,
	useGanttBarDrag,
	useGanttBarKeyboard,
	type GanttBarDrag,
	type GanttKeyLike,
} from './useGanttBar'

const day = (month: number, date: number) => new Date(2026, month - 1, date)
const span = {start: day(9, 10), end: day(9, 14)}

function key(name: string, modifiers: Partial<GanttKeyLike> = {}): GanttKeyLike {
	return {key: name, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...modifiers}
}

describe('daysBetween', () => {
	it('counts calendar days, whatever the time of day', () => {
		expect(daysBetween(new Date(2026, 8, 10, 23, 30), new Date(2026, 8, 11, 0, 15))).toBe(1)
		expect(daysBetween(day(9, 14), day(9, 10))).toBe(-4)
	})

	it('is not thrown off by daylight saving changes', () => {
		expect(daysBetween(day(3, 20), day(4, 10))).toBe(21)
		expect(daysBetween(day(10, 20), day(11, 10))).toBe(21)
	})
})

describe('keyboardBarEdit', () => {
	it('moves the whole bar a day with the plain arrows', () => {
		expect(keyboardBarEdit(key('ArrowLeft'))).toEqual({start: -1, end: -1})
		expect(keyboardBarEdit(key('ArrowRight'))).toEqual({start: 1, end: 1})
	})

	it('grows the bar on that side with Shift', () => {
		expect(keyboardBarEdit(key('ArrowLeft', {shiftKey: true}))).toEqual({start: -1, end: 0})
		expect(keyboardBarEdit(key('ArrowRight', {shiftKey: true}))).toEqual({start: 0, end: 1})
	})

	it('shrinks the bar from that side with Ctrl or Cmd', () => {
		expect(keyboardBarEdit(key('ArrowLeft', {ctrlKey: true}))).toEqual({start: 1, end: 0})
		expect(keyboardBarEdit(key('ArrowRight', {metaKey: true}))).toEqual({start: 0, end: -1})
	})

	it('ignores other keys and Alt combinations', () => {
		expect(keyboardBarEdit(key('ArrowUp'))).toBeNull()
		expect(keyboardBarEdit(key('Enter'))).toBeNull()
		expect(keyboardBarEdit(key('ArrowLeft', {altKey: true}))).toBeNull()
	})
})

describe('applyBarEdit', () => {
	it('moves the edges by whole days', () => {
		expect(applyBarEdit(span, {start: 2, end: 3})).toEqual({start: day(9, 12), end: day(9, 17)})
	})

	it('allows a one-day bar but nothing shorter', () => {
		expect(applyBarEdit(span, {start: 4, end: 0})).toEqual({start: day(9, 14), end: day(9, 14)})
		expect(applyBarEdit(span, {start: 5, end: 0})).toBeNull()
		expect(applyBarEdit(span, {start: 0, end: -5})).toBeNull()
	})
})

describe('snapToDays', () => {
	it('snaps pointer travel to the nearest day', () => {
		expect(snapToDays(40, 32)).toBe(1)
		expect(snapToDays(47, 32)).toBe(1)
		expect(snapToDays(49, 32)).toBe(2)
		expect(snapToDays(-49, 32)).toBe(-2)
		expect(snapToDays(10, 32)).toBe(0)
	})

	it('never returns negative zero or NaN', () => {
		expect(Object.is(snapToDays(-3, 32), 0)).toBe(true)
		expect(snapToDays(100, 0)).toBe(0)
	})
})

describe('dragBarEdit', () => {
	it('moves both edges for the body', () => {
		expect(dragBarEdit('move', -3, span)).toEqual({start: -3, end: -3})
	})

	it('stops an edge where the bar would be under a day', () => {
		expect(dragBarEdit('start', 10, span)).toEqual({start: 4, end: 0})
		expect(dragBarEdit('start', -2, span)).toEqual({start: -2, end: 0})
		expect(dragBarEdit('end', -10, span)).toEqual({start: 0, end: -4})
		expect(dragBarEdit('end', 3, span)).toEqual({start: 0, end: 3})
	})

	it('draws in either direction from the day it started on', () => {
		const anchor = {start: day(9, 10), end: day(9, 10)}
		expect(dragBarEdit('draw', 3, anchor)).toEqual({start: 0, end: 3})
		expect(dragBarEdit('draw', -2, anchor)).toEqual({start: -2, end: 0})
	})
})

describe('useGanttBarKeyboard', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('adds up presses in a row into one save once the keys rest', () => {
		const onCommit = vi.fn()
		const scope = effectScope()
		const keyboard = scope.run(() => useGanttBarKeyboard({onCommit, delay: 400}))!

		expect(keyboard.onKeydown(key('ArrowRight'), 7, span)).toBe(true)
		keyboard.onKeydown(key('ArrowRight'), 7, span)
		keyboard.onKeydown(key('ArrowRight', {shiftKey: true}), 7, span)
		expect(keyboard.pending.value).toEqual({id: 7, edit: {start: 2, end: 3}})
		expect(onCommit).not.toHaveBeenCalled()

		vi.advanceTimersByTime(400)
		expect(onCommit).toHaveBeenCalledOnce()
		expect(onCommit).toHaveBeenCalledWith(7, {start: 2, end: 3})
		expect(keyboard.pending.value).toBeNull()
		scope.stop()
	})

	it('saves the previous bar right away when another one gets a key', () => {
		const onCommit = vi.fn()
		const scope = effectScope()
		const keyboard = scope.run(() => useGanttBarKeyboard({onCommit}))!

		keyboard.onKeydown(key('ArrowLeft'), 1, span)
		keyboard.onKeydown(key('ArrowRight'), 2, span)

		expect(onCommit).toHaveBeenCalledWith(1, {start: -1, end: -1})
		expect(keyboard.pending.value).toEqual({id: 2, edit: {start: 1, end: 1}})
		scope.stop()
		expect(onCommit).toHaveBeenLastCalledWith(2, {start: 1, end: 1})
	})

	it('keeps the bar at least a day long and ignores keys that are not edits', () => {
		const onCommit = vi.fn()
		const scope = effectScope()
		const keyboard = scope.run(() => useGanttBarKeyboard({onCommit}))!
		const oneDay = {start: day(9, 10), end: day(9, 10)}

		expect(keyboard.onKeydown(key('ArrowLeft', {ctrlKey: true}), 3, oneDay)).toBe(true)
		expect(keyboard.pending.value).toBeNull()
		expect(keyboard.onKeydown(key('a'), 3, oneDay)).toBe(false)

		vi.runAllTimers()
		expect(onCommit).not.toHaveBeenCalled()
		scope.stop()
	})
})

describe('useGanttBarDrag', () => {
	function pointer(type: string, clientX: number, extra: Partial<PointerEventInit> = {}) {
		return new PointerEvent(type, {clientX, button: 0, pointerType: 'mouse', bubbles: true, ...extra})
	}

	function setup(scroll = {left: 0}) {
		const onCommit = vi.fn<(drag: GanttBarDrag) => void>()
		const scope = effectScope()
		const drag = scope.run(() => useGanttBarDrag({dayWidth: () => 32, scrollLeft: () => scroll.left, onCommit}))!
		return {drag, onCommit, scope}
	}

	it('previews the snapped edit while dragging and commits it on release', () => {
		const {drag, onCommit, scope} = setup()

		drag.start(pointer('pointerdown', 100), {id: 4, mode: 'move', span})
		window.dispatchEvent(pointer('pointermove', 102))
		expect(drag.moved.value).toBe(false)

		window.dispatchEvent(pointer('pointermove', 170))
		expect(drag.moved.value).toBe(true)
		expect(drag.active.value?.edit).toEqual({start: 2, end: 2})

		window.dispatchEvent(pointer('pointerup', 170))
		expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({id: 4, mode: 'move', edit: {start: 2, end: 2}}))
		expect(drag.active.value).toBeNull()
		expect(drag.consumeClick()).toBe(true)
		expect(drag.consumeClick()).toBe(false)
		scope.stop()
	})

	it('treats a press without travel as a click', () => {
		const {drag, onCommit, scope} = setup()

		drag.start(pointer('pointerdown', 100), {id: 4, mode: 'move', span})
		window.dispatchEvent(pointer('pointerup', 101))

		expect(onCommit).not.toHaveBeenCalled()
		expect(drag.consumeClick()).toBe(false)
		scope.stop()
	})

	it('counts scrolling during the drag as travel', () => {
		const scroll = {left: 0}
		const {drag, scope} = setup(scroll)

		drag.start(pointer('pointerdown', 100), {id: 4, mode: 'end', span})
		scroll.left = 64
		window.dispatchEvent(pointer('pointermove', 106))

		expect(drag.active.value?.edit).toEqual({start: 0, end: 2})
		scope.stop()
	})

	it('cancels on Escape without saving', () => {
		const {drag, onCommit, scope} = setup()

		drag.start(pointer('pointerdown', 100), {id: 4, mode: 'move', span})
		window.dispatchEvent(pointer('pointermove', 200))
		window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
		window.dispatchEvent(pointer('pointerup', 200))

		expect(drag.active.value).toBeNull()
		expect(onCommit).not.toHaveBeenCalled()
		scope.stop()
	})

	it('leaves touch and secondary buttons alone', () => {
		const {drag, scope} = setup()

		drag.start(pointer('pointerdown', 100, {pointerType: 'touch'}), {id: 4, mode: 'move', span})
		expect(drag.active.value).toBeNull()
		drag.start(pointer('pointerdown', 100, {button: 2}), {id: 4, mode: 'move', span})
		expect(drag.active.value).toBeNull()
		scope.stop()
	})
})
