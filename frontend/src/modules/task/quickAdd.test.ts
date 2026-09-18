import {describe, expect, it} from 'vitest'

import {SECONDS_A_MONTH, SECONDS_A_YEAR} from '@/constants/date'
import {PrefixMode} from '@/modules/quickAddMagic/prefixes'
import type {ParsedTaskText} from '@/modules/quickAddMagic/types'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'

import {
	buildDefaultRemindersForQuickAdd,
	buildTaskFromQuickAdd,
	matchQuickAddAssignee,
	partitionQuickAddLabels,
	resolveQuickAddProjectId,
} from './quickAdd'

function parsed(overrides: Partial<ParsedTaskText> = {}): ParsedTaskText {
	return {
		text: 'Buy milk',
		date: null,
		labels: [],
		project: null,
		priority: null,
		assignees: [],
		repeats: null,
		...overrides,
	}
}

const DUE = '2026-05-01T00:00:00.000Z'

describe('buildDefaultRemindersForQuickAdd', () => {
	const defaults = [{relative_period: -3600, relative_to: 'start_date' as const}]

	it('adds nothing without a due date or defaults', () => {
		expect(buildDefaultRemindersForQuickAdd(defaults, null)).toEqual([])
		expect(buildDefaultRemindersForQuickAdd(undefined, DUE)).toEqual([])
		expect(buildDefaultRemindersForQuickAdd([], DUE)).toEqual([])
	})

	it('makes every default relative to the due date', () => {
		expect(buildDefaultRemindersForQuickAdd(defaults, DUE)).toEqual([
			{relative_period: -3600, relative_to: 'due_date'},
		])
	})
})

describe('resolveQuickAddProjectId', () => {
	const projects = [
		{id: 1, title: 'Inbox', identifier: 'INB'},
		{id: 2, title: 'Work', identifier: 'WRK'},
	]

	it('finds the magic project by title, then by identifier', () => {
		expect(resolveQuickAddProjectId('work', projects, 1)).toBe(2)
		expect(resolveQuickAddProjectId('wrk', projects, 1)).toBe(2)
	})

	it('falls back to the given project', () => {
		expect(resolveQuickAddProjectId('unknown', projects, 1)).toBe(1)
		expect(resolveQuickAddProjectId(null, projects, 2)).toBe(2)
	})

	it('returns null without any project', () => {
		expect(resolveQuickAddProjectId(null, projects, 0)).toBeNull()
		expect(resolveQuickAddProjectId('unknown', projects, -2)).toBeNull()
	})
})

describe('matchQuickAddAssignee', () => {
	const alice = {id: 1, username: 'alice', name: 'Alice Doe'}
	const bob = {id: 2, username: 'bob', name: 'Bob Alison', email: 'bob@example.com'}

	it('accepts a partial match when the search found one user', () => {
		expect(matchQuickAddAssignee([alice], 'ali')).toBe(alice)
	})

	it('needs an exact username, name or email among several users', () => {
		expect(matchQuickAddAssignee([alice, bob], 'ali')).toBeUndefined()
		expect(matchQuickAddAssignee([alice, bob], 'BOB')).toBe(bob)
		expect(matchQuickAddAssignee([alice, bob], 'bob@example.com')).toBe(bob)
	})
})

describe('partitionQuickAddLabels', () => {
	it('reuses existing labels case-insensitively and lists each missing title once', () => {
		const labels = [{id: 1, title: 'Urgent'}]

		expect(partitionQuickAddLabels(labels, ['urgent', 'URGENT', 'new', 'New'])).toEqual({
			found: [{id: 1, title: 'Urgent'}],
			missing: ['new'],
		})
	})
})

describe('buildTaskFromQuickAdd', () => {
	const base = {title: 'raw', projectId: 3, magicMode: PrefixMode.Default}

	it('keeps the raw input when only magic words were entered', () => {
		expect(buildTaskFromQuickAdd({...base, title: ' *label ', parsed: parsed({text: '', labels: ['label']}), bucketId: 4}))
			.toEqual({task: {title: '*label', project_id: 3, bucket_id: 4}, labels: []})
	})

	it('builds the create body from the parsed text', () => {
		const {task, labels} = buildTaskFromQuickAdd({
			...base,
			parsed: parsed({
				text: 'Buy milk @alice @nobody',
				date: new Date(DUE),
				priority: 3,
				labels: ['groceries'],
			}),
			assignees: [{user: {id: 1, username: 'alice'}, match: 'alice'}],
			defaultReminders: [{relative_period: -600, relative_to: 'due_date'}],
			position: 12,
		})

		expect(task).toEqual({
			title: 'Buy milk @nobody',
			project_id: 3,
			position: 12,
			due_date: DUE,
			priority: 3,
			reminders: [{relative_period: -600, relative_to: 'due_date'}],
			assignees: [{id: 1}],
		})
		expect(labels).toEqual(['groceries'])
	})

	it.each([
		[{type: 'months', amount: 1}, 30 * 24 * 3600, TASK_REPEAT_MODES.REPEAT_MODE_MONTH],
		[{type: 'months', amount: 6}, 6 * SECONDS_A_MONTH, TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT],
		[{type: 'years', amount: 1}, SECONDS_A_YEAR, TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT],
	] as const)('sets the repeat interval for %o', (repeats, seconds, mode) => {
		const {task} = buildTaskFromQuickAdd({...base, parsed: parsed({repeats: {...repeats}})})

		expect(task.repeat_after).toBe(seconds)
		expect(task.repeat_mode).toBe(mode)
	})
})
