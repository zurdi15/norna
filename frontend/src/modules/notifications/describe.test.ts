import {describe, expect, it} from 'vitest'

import {describeNotification} from './describe'

const doer = {id: 1, username: 'astrid', name: 'Astrid Lund'}

describe('describeNotification', () => {
	it('links a comment to its task', () => {
		expect(describeNotification({name: 'task.comment', notification: {doer, task: {id: 12, title: 'Revisar'}}})).toEqual({
			actor: doer,
			key: 'notifications.taskComment',
			params: {task: 'Revisar'},
			to: {name: 'task.detail', params: {id: 12}},
		})
	})

	it('speaks to the reader when they are the assignee', () => {
		const notification = {name: 'task.assigned', notification: {doer, task: {id: 3, title: 'T'}, assignee: {id: 7, username: 'zurdi'}}}

		expect(describeNotification(notification, 7).key).toBe('notifications.taskAssignedYou')
		expect(describeNotification(notification, 8)).toMatchObject({
			key: 'notifications.taskAssigned',
			params: {assignee: 'zurdi'},
		})
	})

	it('has no link for a deleted task', () => {
		expect(describeNotification({name: 'task.deleted', notification: {doer, task: {id: 3, title: 'T'}}}).to).toBeUndefined()
	})

	it('has no actor for reminders', () => {
		expect(describeNotification({name: 'task.reminder', notification: {task: {id: 3, title: 'T'}}}).actor).toBeUndefined()
	})

	it('tells a single overdue task from a digest', () => {
		expect(describeNotification({name: 'task.undone.overdue', notification: {task: {id: 3, title: 'T'}}}).key).toBe('notifications.taskOverdue')
		expect(describeNotification({name: 'task.undone.overdue', notification: {tasks: {}}}).key).toBe('notifications.tasksOverdue')
	})

	it('falls back for names it does not know or a malformed payload', () => {
		expect(describeNotification({name: 'something.new', notification: null}).key).toBe('notifications.unknown')
	})
})
