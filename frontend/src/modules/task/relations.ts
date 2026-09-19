import type {Task, TaskRelation} from '@/client/generated'

export type RelationKind = NonNullable<TaskRelation['relation_kind']>

const INVERSE_RELATION: Record<RelationKind, RelationKind> = {
	subtask: 'parenttask',
	parenttask: 'subtask',
	related: 'related',
	duplicateof: 'duplicates',
	duplicates: 'duplicateof',
	blocking: 'blocked',
	blocked: 'blocking',
	precedes: 'follows',
	follows: 'precedes',
	copiedfrom: 'copiedto',
	copiedto: 'copiedfrom',
}

/** The relation the api stores on the other task, mirroring getInverseRelation in the backend. */
export function inverseRelationKind(kind: RelationKind): RelationKind {
	return INVERSE_RELATION[kind]
}

export type RelatedTasks = NonNullable<Task['related_tasks']>

export function addRelatedTask(related: Task['related_tasks'], kind: RelationKind, other: Task): RelatedTasks {
	const existing = related?.[kind] ?? []
	return {
		...related,
		[kind]: [...existing.filter(task => task.id !== other.id), other],
	}
}

export function removeRelatedTask(related: Task['related_tasks'], kind: RelationKind, otherId: number): RelatedTasks {
	const next: RelatedTasks = {...related}
	const remaining = (related?.[kind] ?? []).filter(task => task.id !== otherId)
	if (remaining.length > 0) {
		next[kind] = remaining
	} else {
		delete next[kind]
	}
	return next
}
