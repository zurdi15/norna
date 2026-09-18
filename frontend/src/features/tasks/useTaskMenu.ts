import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {
	CalendarArrowUp,
	CalendarClock,
	CalendarDays,
	CalendarX2,
	CircleCheck,
	Circle,
	Copy,
	Link,
	PanelRightOpen,
	Star,
	StarOff,
	Trash2,
} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {getDateWithTime} from '@/helpers/time/getDateWithTime'
import {getTaskDate} from '@/modules/task/task'
import {useTaskActionsStore} from '@/stores/taskActions'
import {addDays, startOfDay} from '@/helpers/time/dateMath'
import type {UiMenuEntry} from '@/ui/menu'

import {useTaskLink} from './useTaskLink'

/** The actions menu of a task: right click and "⋯" on pointer screens, long press or swipe on touch. */
export function useTaskMenu() {
	const {t} = useI18n()
	const router = useRouter()
	const taskLink = useTaskLink()
	const actions = useTaskActionsStore()

	// A day picked from the menu keeps the task's time of day, or takes the user's default due time.
	function onDay(task: Task, day: Date): Date {
		const current = getTaskDate(task.due_date)
		if (!current) {
			return getDateWithTime(day)
		}
		const date = new Date(day)
		date.setHours(current.getHours(), current.getMinutes(), 0, 0)
		return date
	}

	// onDeleted lets the detail leave the page of a task that no longer exists.
	// Tasks of a read-only project can only be opened and shared.
	return (task: Task, options: {onDeleted?: () => void, readOnly?: boolean} = {}): UiMenuEntry[] => {
		const open: UiMenuEntry = {
			label: t('tasks.actions.open'),
			icon: PanelRightOpen,
			onSelect: () => void router.push(taskLink(task.id ?? 0)),
		}
		const copyLink: UiMenuEntry = {
			label: t('tasks.actions.copyLink'),
			icon: Link,
			onSelect: () => void actions.copyLink(task),
		}
		if (options.readOnly) {
			return [open, copyLink]
		}
		const today = startOfDay(new Date())
		const due = getTaskDate(task.due_date)
		return [
			open,
			{
				label: task.done ? t('tasks.actions.markUndone') : t('tasks.actions.markDone'),
				icon: task.done ? Circle : CircleCheck,
				onSelect: () => actions.setDone(task, !task.done),
			},
			{type: 'separator'},
			{type: 'label', label: t('tasks.actions.dueHeading')},
			{
				label: t('tasks.actions.dueToday'),
				icon: CalendarClock,
				onSelect: () => actions.setDueDate(task, onDay(task, today)),
			},
			{
				label: t('tasks.actions.dueTomorrow'),
				icon: CalendarArrowUp,
				onSelect: () => actions.setDueDate(task, onDay(task, addDays(today, 1))),
			},
			{
				label: t('tasks.actions.dueNextWeek'),
				icon: CalendarDays,
				onSelect: () => actions.setDueDate(task, onDay(task, addDays(today, 7))),
			},
			...(due ? [{
				label: t('tasks.actions.dueRemove'),
				icon: CalendarX2,
				onSelect: () => actions.setDueDate(task, null),
			}] : []),
			{type: 'separator'},
			{
				label: task.is_favorite ? t('tasks.actions.unfavorite') : t('tasks.actions.favorite'),
				icon: task.is_favorite ? StarOff : Star,
				onSelect: () => actions.toggleFavorite(task),
			},
			copyLink,
			{
				label: t('tasks.actions.duplicate'),
				icon: Copy,
				onSelect: () => void actions.duplicateTask(task),
			},
			{type: 'separator'},
			{
				label: t('tasks.actions.delete'),
				icon: Trash2,
				tone: 'danger',
				onSelect: async () => {
					if (await actions.deleteTask(task)) {
						options.onDeleted?.()
					}
				},
			},
		]
	}
}
