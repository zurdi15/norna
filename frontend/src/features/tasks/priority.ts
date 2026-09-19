import {PRIORITIES, type Priority} from '@/constants/priorities'

const LEVEL_KEYS: Record<Priority, string> = {
	[PRIORITIES.UNSET]: 'tasks.priority.unset',
	[PRIORITIES.LOW]: 'tasks.priority.low',
	[PRIORITIES.MEDIUM]: 'tasks.priority.medium',
	[PRIORITIES.HIGH]: 'tasks.priority.high',
	[PRIORITIES.URGENT]: 'tasks.priority.urgent',
	[PRIORITIES.DO_NOW]: 'tasks.priority.doNow',
}

/** Highest first, as pickers list them. */
export const PRIORITY_LEVELS = [
	PRIORITIES.DO_NOW,
	PRIORITIES.URGENT,
	PRIORITIES.HIGH,
	PRIORITIES.MEDIUM,
	PRIORITIES.LOW,
	PRIORITIES.UNSET,
] as const satisfies readonly Priority[]

export function priorityLabelKey(priority: number): string {
	return LEVEL_KEYS[priority as Priority] ?? LEVEL_KEYS[PRIORITIES.UNSET]
}
