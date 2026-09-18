import type {Task} from '@/client/generated'
import {buildGanttTaskTree, type GanttTaskTreeNode} from '@/helpers/ganttTaskTree'

import {barIntersects, taskBar, type GanttBar} from './ganttBars'
import type {GanttRange} from './ganttRange'

export interface GanttRow {
	id: number
	task: Task
	indent: number
	isParent: boolean
	parentId: number | null
	bar: GanttBar | null
}

/** Where a task sorts: its start, its end, open before done, then its id. */
export type GanttSortKey = readonly [start: number, end: number, done: number, id: number]

export interface GanttRowsOptions {
	range: GanttRange
	showUndated: boolean
	collapsed: ReadonlySet<number>
	/**
	 * Sort keys handed out earlier, filled in for new tasks. A task keeps its key while its
	 * dates change, so a bar being moved doesn't take its row away from the pointer or focus.
	 */
	sortKeys?: Map<number, GanttSortKey>
}

export interface GanttRows {
	rows: GanttRow[]
	/** Tasks in the range but hidden under a collapsed parent, mapped to the row that stands in for them. */
	hiddenToAncestor: Map<number, number>
	tasks: Map<number, Task>
}

function nodeBar(node: GanttTaskTreeNode): GanttBar | null {
	return taskBar(node.task, node.hasDerivedDates
		? {start: node.derivedStartDate, end: node.derivedEndDate}
		: undefined)
}

function sortKey(task: Task, bar: GanttBar | null): GanttSortKey {
	return [bar?.start.getTime() ?? Infinity, bar?.end.getTime() ?? 0, Number(task.done ?? false), task.id ?? 0]
}

function compareKeys(a: GanttSortKey, b: GanttSortKey): number {
	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) {
			return a[index]! < b[index]! ? -1 : 1
		}
	}
	return 0
}

/**
 * The rows of the chart: parents above their subtasks, siblings by start date and
 * tasks without dates last. A task shows when its bar reaches into the range (or, if
 * asked for, when it has no dates); its parents come along so it keeps its place.
 */
export function buildGanttRows(input: readonly Task[], options: GanttRowsOptions): GanttRows {
	const unsorted = new Map<number, Task>()
	for (const task of input) {
		if (typeof task.id === 'number' && !unsorted.has(task.id)) {
			unsorted.set(task.id, task)
		}
	}

	// A first pass works out the spans dateless parents borrow from their subtasks, which sort them.
	const sorted = buildGanttTaskTree(unsorted)
		.map(node => {
			const id = node.task.id!
			const key = options.sortKeys?.get(id) ?? sortKey(node.task, nodeBar(node))
			options.sortKeys?.set(id, key)
			return {task: node.task, key}
		})
		.sort((a, b) => compareKeys(a.key, b.key))
	const tasks = new Map(sorted.map(({task}) => [task.id!, task]))
	const nodes = buildGanttTaskTree(tasks)
	const byId = new Map(nodes.map(node => [node.task.id!, node]))

	const shown = new Set<number>()
	const bars = new Map<number, GanttBar | null>()
	for (const node of nodes) {
		const id = node.task.id!
		const bar = nodeBar(node)
		bars.set(id, bar)
		if (!(bar ? barIntersects(bar, options.range) : options.showUndated)) continue
		let current: GanttTaskTreeNode | undefined = node
		while (current && !shown.has(current.task.id!)) {
			shown.add(current.task.id!)
			current = current.parentId === null ? undefined : byId.get(current.parentId)
		}
	}

	const rows: GanttRow[] = []
	const hiddenToAncestor = new Map<number, number>()
	for (const node of nodes) {
		const id = node.task.id!
		if (!shown.has(id)) continue
		const parentId = node.parentId
		if (parentId !== null && (hiddenToAncestor.has(parentId) || options.collapsed.has(parentId))) {
			hiddenToAncestor.set(id, hiddenToAncestor.get(parentId) ?? parentId)
			continue
		}
		rows.push({
			id,
			task: node.task,
			indent: node.indentLevel,
			isParent: node.childIds.some(childId => shown.has(childId)),
			parentId,
			bar: bars.get(id) ?? null,
		})
	}

	return {rows, hiddenToAncestor, tasks}
}
