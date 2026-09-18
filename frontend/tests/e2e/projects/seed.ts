import {BucketFactory} from '../../factories/bucket'
import {ProjectFactory} from '../../factories/project'
import {ProjectViewFactory} from '../../factories/project_view'
import {TaskFactory} from '../../factories/task'
import {TaskBucketFactory} from '../../factories/task_buckets'

const VIEW_KINDS = [
	{kind: 0, title: 'List'},
	{kind: 1, title: 'Gantt'},
	{kind: 2, title: 'Table'},
	{kind: 3, title: 'Kanban'},
] as const

/** A project with the four views the api creates by default; view ids start at projectId * 10. */
export async function seedProject(ownerId: number, id: number, title: string, extra: Record<string, unknown> = {}) {
	await ProjectFactory.create(1, {id, title, owner_id: ownerId, ...extra}, id === 1)
	for (const [index, view] of VIEW_KINDS.entries()) {
		await ProjectViewFactory.create(1, {
			id: id * 10 + index,
			project_id: id,
			title: view.title,
			view_kind: view.kind,
			position: index,
			...(view.kind === 3 ? {bucket_configuration_mode: 1} : {}),
		}, id === 1 && index === 0)
	}
}

export async function seedTasks(projectId: number, ownerId: number, tasks: {title: string, due?: string, start?: string, end?: string}[]) {
	await TaskFactory.truncate()
	for (const [index, task] of tasks.entries()) {
		await TaskFactory.create(1, {
			id: index + 1,
			title: task.title,
			project_id: projectId,
			created_by_id: ownerId,
			position: (index + 1) * 1000,
			...(task.due ? {due_date: task.due} : {}),
			...(task.start ? {start_date: task.start} : {}),
			...(task.end ? {end_date: task.end} : {}),
		}, false)
	}
}

/**
 * Columns for the project's kanban view (id projectId * 10 + 3), with ids from 1, and
 * each seeded task placed in the column at the same index of `placement`.
 */
export async function seedBoard(projectId: number, ownerId: number, columns: string[], placement: number[]) {
	const viewId = projectId * 10 + 3
	await BucketFactory.truncate()
	for (const [index, title] of columns.entries()) {
		await BucketFactory.create(1, {
			id: index + 1,
			title,
			project_view_id: viewId,
			position: (index + 1) * 1000,
			created_by_id: ownerId,
		}, false)
	}
	await TaskBucketFactory.truncate()
	for (const [index, column] of placement.entries()) {
		await TaskBucketFactory.create(1, {task_id: index + 1, bucket_id: column + 1, project_view_id: viewId}, false)
	}
}

export function dayAt(days: number, hour = 12): string {
	const date = new Date()
	date.setDate(date.getDate() + days)
	date.setHours(hour, 0, 0, 0)
	return date.toISOString()
}
