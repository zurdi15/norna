import type {RelationKind} from '@/modules/task/relations'

/** Every relation kind, the everyday ones first; subtasks have their own block. */
export const RELATION_KINDS: readonly RelationKind[] = [
	'related',
	'blocking',
	'blocked',
	'parenttask',
	'subtask',
	'precedes',
	'follows',
	'duplicateof',
	'duplicates',
	'copiedfrom',
	'copiedto',
]
