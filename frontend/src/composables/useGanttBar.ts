import {onScopeDispose, shallowRef} from 'vue'

export type GanttBarDateType = 'both' | 'startOnly' | 'endOnly'

/** A bar in whole days: the first and the last day it covers, both at 00:00 local time. */
export interface GanttDaySpan {
	start: Date
	end: Date
}

/** How many whole days each edge of a bar moves. */
export interface GanttBarEdit {
	start: number
	end: number
}

/**
 * move and the two edges edit an existing bar; draw sketches a new one from the day
 * the pointer went down on, in either direction.
 */
export type GanttDragMode = 'move' | 'start' | 'end' | 'draw'

export const NO_EDIT: GanttBarEdit = Object.freeze({start: 0, end: 0})

const MILLISECONDS_A_DAY = 86_400_000

/** Calendar days from a to b, immune to daylight saving shifts. */
export function daysBetween(a: Date, b: Date): number {
	return Math.round((
		Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
		Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
	) / MILLISECONDS_A_DAY)
}

function shiftDays(date: Date, days: number): Date {
	const result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

export function isNoEdit(edit: GanttBarEdit): boolean {
	return edit.start === 0 && edit.end === 0
}

export function combineEdits(a: GanttBarEdit, b: GanttBarEdit): GanttBarEdit {
	return {start: a.start + b.start, end: a.end + b.end}
}

/** The span after the edit, or null when the edit would leave it shorter than a day. */
export function applyBarEdit(span: GanttDaySpan, edit: GanttBarEdit): GanttDaySpan | null {
	const start = shiftDays(span.start, edit.start)
	const end = shiftDays(span.end, edit.end)
	return daysBetween(start, end) < 0 ? null : {start, end}
}

export interface GanttKeyLike {
	key: string
	shiftKey: boolean
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
}

/**
 * The arrow keys of a focused bar (see the "gantt" shortcuts): arrows move it a day,
 * Shift grows it on that side and Ctrl or Cmd shrinks it from that side.
 */
export function keyboardBarEdit(event: GanttKeyLike): GanttBarEdit | null {
	if (event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
		return null
	}
	const direction = event.key === 'ArrowRight' ? 1 : -1
	if (event.shiftKey) {
		return direction < 0 ? {start: -1, end: 0} : {start: 0, end: 1}
	}
	if (event.ctrlKey || event.metaKey) {
		return direction < 0 ? {start: 1, end: 0} : {start: 0, end: -1}
	}
	return {start: direction, end: direction}
}

/** Pointer travel in whole days: a bar snaps to the nearest day. */
export function snapToDays(deltaPx: number, dayWidth: number): number {
	if (!(dayWidth > 0)) {
		return 0
	}
	return Math.round(deltaPx / dayWidth) || 0
}

/** The edit a drag of so many days makes; edges stop where the bar would be under a day long. */
export function dragBarEdit(mode: GanttDragMode, days: number, span: GanttDaySpan): GanttBarEdit {
	const length = daysBetween(span.start, span.end)
	switch (mode) {
		case 'move':
			return {start: days, end: days}
		case 'start':
			return {start: Math.min(days, length), end: 0}
		case 'end':
			return {start: 0, end: Math.max(days, -length)}
		case 'draw':
			return days < 0 ? {start: days, end: 0} : {start: 0, end: days}
	}
}

// Below this a press is a click, which opens the task.
const DRAG_THRESHOLD_PX = 4

export interface GanttBarDrag {
	id: number
	mode: GanttDragMode
	span: GanttDaySpan
	edit: GanttBarEdit
}

export interface UseGanttBarDragOptions {
	dayWidth: () => number
	/** The scroll offset of the timeline, so scrolling while dragging counts as travel. */
	scrollLeft: () => number
	onCommit: (drag: GanttBarDrag) => void
}

/**
 * Dragging bars with a mouse or pen: the whole bar moves it, its ends resize it, and on a
 * row without dates a drag draws one. The edit previews while dragging and commits once
 * on release; Escape cancels.
 */
export function useGanttBarDrag(options: UseGanttBarDragOptions) {
	const active = shallowRef<GanttBarDrag | null>(null)
	const moved = shallowRef(false)
	let origin: {x: number, scroll: number} | null = null
	let suppressClick = false

	function onMove(event: PointerEvent) {
		const drag = active.value
		if (!drag || !origin) return
		const deltaPx = event.clientX - origin.x + options.scrollLeft() - origin.scroll
		if (!moved.value && Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return
		moved.value = true
		const edit = dragBarEdit(drag.mode, snapToDays(deltaPx, options.dayWidth()), drag.span)
		if (edit.start !== drag.edit.start || edit.end !== drag.edit.end) {
			active.value = {...drag, edit}
		}
	}

	function onUp() {
		const drag = active.value
		const wasMoved = moved.value
		stop()
		if (!drag || !wasMoved) return
		// The click that follows a drag must not open the task.
		suppressClick = true
		window.setTimeout(() => {
			suppressClick = false
		})
		if (!isNoEdit(drag.edit) || drag.mode === 'draw') {
			options.onCommit(drag)
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault()
			stop()
		}
	}

	function stop() {
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', stop)
		window.removeEventListener('keydown', onKeydown, true)
		active.value = null
		moved.value = false
		origin = null
	}

	function start(event: PointerEvent, drag: Omit<GanttBarDrag, 'edit'>) {
		if (event.button !== 0 || event.pointerType === 'touch' || active.value) return
		// No text selection or native drag while the bar moves.
		event.preventDefault()
		origin = {x: event.clientX, scroll: options.scrollLeft()}
		active.value = {...drag, edit: NO_EDIT}
		moved.value = false
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
		window.addEventListener('pointercancel', stop)
		window.addEventListener('keydown', onKeydown, true)
	}

	/** True once for the click event that ends a drag. */
	function consumeClick(): boolean {
		const suppressed = suppressClick
		suppressClick = false
		return suppressed
	}

	onScopeDispose(stop)

	return {active, moved, start, cancel: stop, consumeClick}
}

export interface UseGanttBarKeyboardOptions {
	onCommit: (id: number, edit: GanttBarEdit) => void
	/** Quiet time after the last key press before the change is saved. */
	delay?: number
}

/**
 * Arrow key edits of the focused bar. Presses in a row add up to one pending edit, shown
 * right away and saved once the keys rest, so holding a key doesn't send a request per day.
 */
export function useGanttBarKeyboard(options: UseGanttBarKeyboardOptions) {
	const pending = shallowRef<{id: number, edit: GanttBarEdit} | null>(null)
	let timer: ReturnType<typeof setTimeout> | undefined

	function flush() {
		clearTimeout(timer)
		const current = pending.value
		pending.value = null
		if (current && !isNoEdit(current.edit)) {
			options.onCommit(current.id, current.edit)
		}
	}

	/** Handles the key when it edits bars; returns whether it did. */
	function onKeydown(event: GanttKeyLike, id: number, span: GanttDaySpan): boolean {
		const edit = keyboardBarEdit(event)
		if (!edit) {
			return false
		}
		if (pending.value && pending.value.id !== id) {
			flush()
		}
		const combined = combineEdits(pending.value?.edit ?? NO_EDIT, edit)
		if (applyBarEdit(span, combined)) {
			pending.value = {id, edit: combined}
		}
		clearTimeout(timer)
		timer = setTimeout(flush, options.delay ?? 450)
		return true
	}

	onScopeDispose(flush)

	return {pending, onKeydown, flush}
}
