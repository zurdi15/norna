import type {Task, TaskReminder, TaskWritable} from '@/client/generated'
import {colorFromHex} from '@/helpers/color/colorFromHex'
import {toCssHex} from '@/helpers/color/toCssHex'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {toISOStringOrNull} from '@/helpers/time/toISOStringOrNull'

// The api's "no date": its date fields are non-nullable strings, so clearing one sends the zero time.
export const NO_DATE = '0001-01-01T00:00:00Z'

export type TaskDateField = 'due_date' | 'start_date' | 'end_date'

/** Writable task fields as forms hold them: dates may be Date objects or null. */
export type TaskInput = Omit<TaskWritable, TaskDateField> & Partial<Record<TaskDateField, Date | string | null>>

export type NormalizedTaskInput<T extends TaskInput> = Omit<T, TaskDateField> & Pick<TaskWritable, TaskDateField>

export function getTaskIdentifier(task: Pick<Task, 'identifier' | 'index'> | null | undefined): string {
	if (!task) {
		return ''
	}
	// Projects without an identifier make the api send "-<index>".
	if (!task.identifier || task.identifier === `-${task.index}`) {
		return `#${task.index ?? 0}`
	}
	return task.identifier
}

export function getTaskColor(task: Pick<Task, 'hex_color'> | null | undefined): string | undefined {
	return toCssHex(task?.hex_color)
}

export function getTaskDate(value: string | null | undefined): Date | null {
	return parseDateOrNull(value)
}

export function toApiDate(date: Date | string | null | undefined): string {
	return toISOStringOrNull(date) ?? NO_DATE
}

function normalizeReminder(reminder: TaskReminder): TaskReminder {
	if (reminder.relative_to) {
		return {relative_period: reminder.relative_period ?? 0, relative_to: reminder.relative_to}
	}
	return {reminder: toApiDate(reminder.reminder)}
}

/**
 * Shapes form input into what the api accepts: a trimmed title, a color without
 * the '#', dates as ISO strings (the zero time when cleared) and reminders without
 * a null date. Only the fields present in the input are returned.
 */
export function normalizeTaskInput<T extends TaskInput>(input: T): NormalizedTaskInput<T> {
	const {due_date: dueDate, start_date: startDate, end_date: endDate, ...rest} = input
	const task = {...rest} as NormalizedTaskInput<T> & TaskWritable

	if (typeof rest.title === 'string') {
		task.title = rest.title.trim()
	}
	if (typeof rest.hex_color === 'string') {
		task.hex_color = colorFromHex(rest.hex_color)
	}
	if (rest.reminders) {
		task.reminders = rest.reminders.filter(Boolean).map(normalizeReminder)
	}
	if (dueDate !== undefined) {
		task.due_date = toApiDate(dueDate)
	}
	if (startDate !== undefined) {
		task.start_date = toApiDate(startDate)
	}
	if (endDate !== undefined) {
		task.end_date = toApiDate(endDate)
	}
	return task
}
