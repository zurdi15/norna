import type {Task} from '@/client/generated'

export interface GanttBarPosition {
	/** Left edge, in px from the timeline start. */
	x: number
	/** Vertical center, in px from the first row's top. */
	y: number
	width: number
	rowIndex: number
}

export type GanttArrowKind = 'blocking' | 'precedes'

export interface GanttArrow {
	fromTaskId: number
	toTaskId: number
	startX: number
	startY: number
	endX: number
	endY: number
	relationKind: GanttArrowKind
}

// follows and blocked are the same relations seen from the other end.
const SOURCE_KINDS: readonly GanttArrowKind[] = ['blocking', 'precedes']

/**
 * Arrows for the dependency relations between tasks that have a bar on screen. A task
 * hidden under a collapsed parent hands its arrows to that parent.
 */
export function buildRelationArrows(
	tasks: Map<number, Task>,
	positions: Map<number, GanttBarPosition>,
	hiddenToAncestor: Map<number, number>,
): GanttArrow[] {
	const arrows: GanttArrow[] = []
	const seen = new Set<string>()

	for (const [taskId, task] of tasks) {
		for (const kind of SOURCE_KINDS) {
			for (const related of task.related_tasks?.[kind] ?? []) {
				if (typeof related.id !== 'number') continue

				const fromId = hiddenToAncestor.get(taskId) ?? taskId
				const toId = hiddenToAncestor.get(related.id) ?? related.id
				const from = positions.get(fromId)
				const to = positions.get(toId)
				if (!from || !to || fromId === toId) continue

				const key = `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}-${kind}`
				if (seen.has(key)) continue
				seen.add(key)

				arrows.push({
					fromTaskId: fromId,
					toTaskId: toId,
					startX: from.x + from.width,
					startY: from.y,
					endX: to.x,
					endY: to.y,
					relationKind: kind,
				})
			}
		}
	}

	return spreadOverlappingArrows(arrows)
}

const PREFERRED_SPREAD_PX = 6
const MAX_TOTAL_SPREAD_PX = 24

/**
 * Arrows that leave or reach the same bar fan out vertically instead of overlapping,
 * within a spread that stays inside the row.
 */
function spreadOverlappingArrows(arrows: GanttArrow[]): GanttArrow[] {
	spreadByKey(arrows, 'fromTaskId', 'startY')
	spreadByKey(arrows, 'toTaskId', 'endY')
	return arrows
}

function spreadByKey(arrows: GanttArrow[], groupKey: 'fromTaskId' | 'toTaskId', yKey: 'startY' | 'endY') {
	const groups = new Map<number, GanttArrow[]>()
	for (const arrow of arrows) {
		const group = groups.get(arrow[groupKey]) ?? []
		group.push(arrow)
		groups.set(arrow[groupKey], group)
	}

	for (const group of groups.values()) {
		if (group.length < 2) continue
		const totalSpread = Math.min((group.length - 1) * PREFERRED_SPREAD_PX, MAX_TOTAL_SPREAD_PX)
		const step = totalSpread / (group.length - 1)
		group.forEach((arrow, index) => {
			arrow[yKey] += -totalSpread / 2 + index * step
		})
	}
}

/**
 * The path of an arrow: an S-curve when the target starts to the right of the source,
 * otherwise a detour out to the right, along the gap between rows, and back in.
 */
export function arrowPath({startX, startY, endX, endY}: GanttArrow, rowHeight: number): string {
	const dx = endX - startX
	if (dx >= 12) {
		const bend = Math.min(dx * 0.5, 40)
		return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
	}
	const out = 10
	const midY = startY + (endY >= startY ? rowHeight / 2 : -rowHeight / 2)
	return [
		`M ${startX} ${startY}`,
		`C ${startX + out} ${startY}, ${startX + out} ${midY}, ${startX} ${midY}`,
		`L ${endX} ${midY}`,
		`C ${endX - out} ${midY}, ${endX - out} ${endY}, ${endX} ${endY}`,
	].join(' ')
}
