import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'

export const PROJECT_ID = 1

/** The day, `days` from today, at `hour` o'clock local time, as the api stores it. */
export function dayAt(days: number, hour = 12): string {
	const date = new Date()
	date.setDate(date.getDate() + days)
	date.setHours(hour, 0, 0, 0)
	return date.toISOString()
}

export async function seedProject(ownerId: number, title = 'Homelab') {
	await ProjectFactory.create(1, {id: PROJECT_ID, title, owner_id: ownerId})
}

/** Tasks in the seeded project; each entry is its title and due date (or none). */
export async function seedTasks(ownerId: number, tasks: {title: string, due?: string, done?: boolean}[]) {
	await TaskFactory.truncate()
	for (const [index, task] of tasks.entries()) {
		await TaskFactory.create(1, {
			id: index + 1,
			title: task.title,
			project_id: PROJECT_ID,
			created_by_id: ownerId,
			done: task.done ?? false,
			...(task.due ? {due_date: task.due} : {}),
		}, false)
	}
}
