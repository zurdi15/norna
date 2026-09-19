import type {Task} from '@/client/generated'
import {getTaskDate} from '@/modules/task/task'

const MAX_INDENT_LEVEL = 4

export interface GanttTaskTreeNode {
	task: Task
	indentLevel: number
	isParent: boolean
	/** The parent this task is nested under, when that parent is part of the tree. */
	parentId: number | null
	childIds: number[]
	derivedStartDate: Date | null
	derivedEndDate: Date | null
	hasDerivedDates: boolean
}

function relatedIds(task: Task, kind: 'subtask' | 'parenttask'): number[] {
	return (task.related_tasks?.[kind] ?? [])
		.map(related => related.id)
		.filter((id): id is number => typeof id === 'number')
}

function hasOwnDates(task: Task): boolean {
	return Boolean(getTaskDate(task.start_date) || getTaskDate(task.end_date) || getTaskDate(task.due_date))
}

/**
 * Builds the parent/subtask tree of the tasks from their related tasks and flattens it
 * depth first, the order of Gantt rows. Roots and siblings keep the map's order, so the
 * caller decides how rows sort. A dateless parent gets the span of its subtasks.
 */
export function buildGanttTaskTree(tasks: Map<number, Task>): GanttTaskTreeNode[] {
	const order = new Map([...tasks.keys()].map((id, index) => [id, index]))
	const childrenMap = new Map<number, number[]>()
	const hasParentInView = new Set<number>()

	for (const [taskId, task] of tasks) {
		const childIds = relatedIds(task, 'subtask')
			.filter(id => tasks.has(id))
			.sort((a, b) => order.get(a)! - order.get(b)!)
		if (childIds.length > 0) {
			childrenMap.set(taskId, childIds)
		}
		if (relatedIds(task, 'parenttask').some(id => tasks.has(id))) {
			hasParentInView.add(taskId)
		}
	}

	const result: GanttTaskTreeNode[] = []
	const visited = new Set<number>()

	function visit(taskId: number, level: number, parentId: number | null) {
		if (visited.has(taskId)) return
		visited.add(taskId)

		const task = tasks.get(taskId)
		if (!task) return

		const childIds = childrenMap.get(taskId) ?? []
		const isParent = childIds.length > 0

		let derivedStartDate: Date | null = null
		let derivedEndDate: Date | null = null
		if (isParent && !hasOwnDates(task)) {
			const dates = collectChildDates(childIds, tasks, childrenMap, new Set([taskId]))
			derivedStartDate = dates.minStart
			derivedEndDate = dates.maxEnd
		}

		result.push({
			task,
			indentLevel: Math.min(level, MAX_INDENT_LEVEL),
			isParent,
			parentId,
			childIds,
			derivedStartDate,
			derivedEndDate,
			hasDerivedDates: derivedStartDate !== null || derivedEndDate !== null,
		})

		for (const childId of childIds) {
			visit(childId, level + 1, taskId)
		}
	}

	for (const taskId of tasks.keys()) {
		if (!hasParentInView.has(taskId)) {
			visit(taskId, 0, null)
		}
	}

	// Tasks only reachable through a cycle of parents have no root; they still get a row.
	for (const taskId of tasks.keys()) {
		visit(taskId, 0, null)
	}

	return result
}

function collectChildDates(
	childIds: number[],
	tasks: Map<number, Task>,
	childrenMap: Map<number, number[]>,
	seen: Set<number>,
): {minStart: Date | null, maxEnd: Date | null} {
	let minStart: Date | null = null
	let maxEnd: Date | null = null

	function include(start: Date | null, end: Date | null) {
		if (start && (!minStart || start < minStart)) {
			minStart = start
		}
		if (end && (!maxEnd || end > maxEnd)) {
			maxEnd = end
		}
	}

	for (const childId of childIds) {
		const child = tasks.get(childId)
		if (!child || seen.has(childId)) continue
		seen.add(childId)

		include(getTaskDate(child.start_date), getTaskDate(child.end_date) ?? getTaskDate(child.due_date))

		const grandchildIds = childrenMap.get(childId) ?? []
		if (grandchildIds.length > 0) {
			const grand = collectChildDates(grandchildIds, tasks, childrenMap, seen)
			include(grand.minStart, grand.maxEnd)
		}
	}

	return {minStart, maxEnd}
}
