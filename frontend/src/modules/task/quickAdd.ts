import type {Label, Project, TaskReminder, TaskWritable, User} from '@/client/generated'
// Leaf modules: the quickAddMagic index pulls in the date parser, which imports the auth store.
import {PREFIXES, type PrefixMode} from '@/modules/quickAddMagic/prefixes'
import {cleanupItemText} from '@/modules/quickAddMagic/textCleanup'
import type {ParsedTaskText} from '@/modules/quickAddMagic/types'
import type {QuickAddDefaultReminder} from '@/modules/settings/userSettings'
import {REMINDER_PERIOD_RELATIVE_TO_TYPES} from '@/types/IReminderPeriodRelativeTo'

import {repeatAfterToSeconds, repeatModeFor} from './repeat'

/**
 * A task create body from quick add. assignees and position are read-only in the
 * schema but the create endpoint still applies them.
 */
export interface QuickAddTask extends TaskWritable {
	assignees?: Pick<User, 'id'>[]
	position?: number
}

export interface QuickAddAssignee {
	user: User
	/** The text after the assignee prefix that matched this user. */
	match: string
}

export interface QuickAddBuildInput {
	title: string
	parsed: ParsedTaskText
	projectId: number
	assignees?: readonly QuickAddAssignee[]
	bucketId?: number
	position?: number
	magicMode: PrefixMode
	defaultReminders?: readonly QuickAddDefaultReminder[]
}

export function buildDefaultRemindersForQuickAdd(
	defaults: readonly QuickAddDefaultReminder[] | undefined,
	dueDate: string | null | undefined,
): TaskReminder[] {
	if (!dueDate || !defaults?.length) {
		return []
	}
	// Quick add only sets a due date, so every default is relative to it.
	return defaults.map(reminder => ({
		relative_period: reminder.relative_period,
		relative_to: REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE,
	}))
}

/**
 * The project named with the magic prefix (by title, then identifier), else the
 * fallback (the current or default project). null when neither exists.
 */
export function resolveQuickAddProjectId(
	projectTitle: string | null | undefined,
	projects: readonly Pick<Project, 'id' | 'title' | 'identifier'>[],
	fallbackProjectId: number,
): number | null {
	if (projectTitle) {
		const wanted = projectTitle.toLowerCase()
		const project = projects.find(p => (p.title ?? '').toLowerCase() === wanted)
			?? projects.find(p => (p.identifier ?? '').toLowerCase() === wanted)
		if (project?.id) {
			return project.id
		}
	}
	return fallbackProjectId > 0 ? fallbackProjectId : null
}

/**
 * Picks the search result a quick add assignee refers to: a single result only has
 * to contain the query, several results need an exact username, name or email.
 */
export function matchQuickAddAssignee(users: readonly User[], query: string): User | undefined {
	const wanted = query.toLowerCase()
	const fuzzy = users.length === 1
	const matches = (value: string | undefined) => {
		const candidate = value?.toLowerCase()
		if (!candidate) {
			return false
		}
		return fuzzy ? candidate.includes(wanted) : candidate === wanted
	}
	return users.find(user => matches(user.username))
		?? users.find(user => matches(user.name))
		?? users.find(user => matches(user.email))
}

export function partitionQuickAddLabels(
	available: readonly Label[],
	titles: readonly string[],
): {found: Label[], missing: string[]} {
	const found = new Map<number | undefined, Label>()
	const missing = new Map<string, string>()
	for (const title of titles) {
		const key = title.toLowerCase()
		const label = available.find(candidate => (candidate.title ?? '').toLowerCase() === key)
		if (label) {
			found.set(label.id, label)
		} else if (!missing.has(key)) {
			missing.set(key, title)
		}
	}
	return {found: [...found.values()], missing: [...missing.values()]}
}

export function buildTaskFromQuickAdd(input: QuickAddBuildInput): {task: QuickAddTask, labels: string[]} {
	const {parsed, projectId, bucketId, position} = input
	const placement: Pick<QuickAddTask, 'bucket_id' | 'position'> = {
		...(bucketId ? {bucket_id: bucketId} : {}),
		...(position !== undefined ? {position} : {}),
	}

	// Nothing but magic words: keep the raw text as the title instead of an empty one.
	if (parsed.text === '') {
		return {
			task: {title: input.title.trim(), project_id: projectId, ...placement},
			labels: [],
		}
	}

	const assignees = input.assignees ?? []
	const assigneePrefix = PREFIXES[input.magicMode]?.assignee
	// Only matched assignees leave the title; an unknown @word stays in it.
	const title = assignees.length > 0 && assigneePrefix
		? cleanupItemText(parsed.text, assignees.map(assignee => assignee.match), assigneePrefix)
		: parsed.text
	const dueDate = parsed.date ? parsed.date.toISOString() : null
	const reminders = buildDefaultRemindersForQuickAdd(input.defaultReminders, dueDate)

	const task: QuickAddTask = {
		title: title.trim(),
		project_id: projectId,
		...placement,
	}
	if (dueDate) {
		task.due_date = dueDate
	}
	if (parsed.priority !== null) {
		task.priority = parsed.priority
	}
	if (parsed.repeats) {
		task.repeat_after = repeatAfterToSeconds(parsed.repeats)
		task.repeat_mode = repeatModeFor(parsed.repeats)
	}
	if (reminders.length > 0) {
		task.reminders = reminders
	}
	if (assignees.length > 0) {
		task.assignees = assignees
			.map(assignee => assignee.user)
			.filter((user): user is User & {id: number} => typeof user.id === 'number')
			.map(user => ({id: user.id}))
	}
	return {task, labels: parsed.labels}
}
