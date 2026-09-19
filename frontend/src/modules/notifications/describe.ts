import type {RouteLocationRaw} from 'vue-router'

import type {DatabaseNotification} from '@/client/generated'
import {getDisplayName} from '@/modules/user/displayName'

interface NotifiedUser {
	id?: number
	username?: string
	name?: string
}

// The payloads as pkg/models/notifications.go serializes them.
interface NotificationPayload {
	doer?: NotifiedUser
	assignee?: NotifiedUser
	member?: NotifiedUser
	task?: {id?: number, title?: string}
	project?: {id?: number, title?: string}
	team?: {id?: number, name?: string}
}

export interface NotificationDescription {
	// Who did it; absent for system notifications like reminders.
	actor?: NotifiedUser
	// Translation key and params for the text after the actor's name.
	key: string
	params: Record<string, string>
	to?: RouteLocationRaw
}

function payloadOf(notification: DatabaseNotification): NotificationPayload {
	const payload = notification.notification
	return typeof payload === 'object' && payload !== null ? payload as NotificationPayload : {}
}

export function describeNotification(notification: DatabaseNotification, currentUserId?: number): NotificationDescription {
	const {doer, assignee, member, task, project, team} = payloadOf(notification)
	const taskTitle = task?.title ?? ''
	const toTask = task?.id ? {name: 'task.detail', params: {id: task.id}} : undefined

	switch (notification.name) {
		case 'task.comment':
			return {actor: doer, key: 'notifications.taskComment', params: {task: taskTitle}, to: toTask}
		case 'task.assigned':
			if (assignee?.id !== undefined && assignee.id === currentUserId) {
				return {actor: doer, key: 'notifications.taskAssignedYou', params: {task: taskTitle}, to: toTask}
			}
			return {
				actor: doer,
				key: 'notifications.taskAssigned',
				params: {task: taskTitle, assignee: getDisplayName(assignee)},
				to: toTask,
			}
		case 'task.deleted':
			return {actor: doer, key: 'notifications.taskDeleted', params: {task: taskTitle}}
		case 'task.created':
			return {actor: doer, key: 'notifications.taskCreated', params: {task: taskTitle}, to: toTask}
		case 'task.mentioned':
			return {actor: doer, key: 'notifications.taskMentioned', params: {task: taskTitle}, to: toTask}
		case 'task.reminder':
			return {key: 'notifications.taskReminder', params: {task: taskTitle}, to: toTask}
		case 'task.undone.overdue':
			return task
				? {key: 'notifications.taskOverdue', params: {task: taskTitle}, to: toTask}
				: {key: 'notifications.tasksOverdue', params: {}, to: {name: 'home'}}
		case 'project.created':
			return {
				actor: doer,
				key: 'notifications.projectCreated',
				params: {project: project?.title ?? ''},
				to: project?.id ? {name: 'project.index', params: {projectId: project.id}} : undefined,
			}
		case 'team.member.added': {
			const toTeam = team?.id ? {name: 'teams.edit', params: {id: team.id}} : undefined
			if (member?.id !== undefined && member.id === currentUserId) {
				return {actor: doer, key: 'notifications.teamMemberAddedYou', params: {team: team?.name ?? ''}, to: toTeam}
			}
			return {
				actor: doer,
				key: 'notifications.teamMemberAdded',
				params: {team: team?.name ?? '', member: getDisplayName(member)},
				to: toTeam,
			}
		}
		case 'data.export.ready':
			return {key: 'notifications.dataExportReady', params: {}, to: {name: 'user.export.download'}}
		default:
			return {actor: doer, key: 'notifications.unknown', params: {}}
	}
}
