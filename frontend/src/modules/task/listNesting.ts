import type {Task} from '@/client/generated'

function parentIds(task: Task): number[] {
	return (task.related_tasks?.parenttask ?? []).map(parent => parent.id).filter((id): id is number => id !== undefined)
}

/**
 * A list shows subtasks nested under their parent when the parent is in the list
 * too; a subtask whose parent is elsewhere (another project, another page, filtered
 * out) stays at the top level. Each nested subtask sits under its first listed parent.
 */
export function nestTasks(tasks: readonly Task[]): {task: Task, subtasks: Task[]}[] {
	const listed = new Set(tasks.map(task => task.id))
	const firstListedParent = (task: Task) => parentIds(task).find(id => listed.has(id))

	const children = new Map<number, Task[]>()
	for (const task of tasks) {
		const parent = firstListedParent(task)
		if (parent !== undefined && parent !== task.id) {
			children.set(parent, [...(children.get(parent) ?? []), task])
		}
	}
	return tasks
		.filter(task => {
			const parent = firstListedParent(task)
			return parent === undefined || parent === task.id
		})
		.map(task => ({task, subtasks: children.get(task.id ?? 0) ?? []}))
}
