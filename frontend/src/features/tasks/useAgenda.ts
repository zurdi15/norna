import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import type {Task} from '@/client/generated'
import {everyTaskQuery, type TaskExpand} from '@/client/queries/tasks'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {addDays, startOfDay} from '@/helpers/time/dateMath'
import {getTaskDate} from '@/modules/task/task'

const AGENDA_EXPAND: TaskExpand[] = ['comment_count', 'is_unread']

function byDue(a: Task, b: Task): number {
	return (getTaskDate(a.due_date)?.getTime() ?? 0) - (getTaskDate(b.due_date)?.getTime() ?? 0)
}

/**
 * The three times of the home page: what is overdue, what is due today (plus what was
 * finished today, for the satisfaction of seeing it), and what comes in the next days.
 * Overdue means due before today; a task due at 9:00 stays in "today" all day.
 */
export function useAgenda(days: MaybeRefOrGetter<number> = 7) {
	const {now} = useGlobalNow()
	// Day boundaries keep the query keys stable while the minute ticks.
	const today = computed(() => startOfDay(now.value))
	const horizon = computed(() => addDays(today.value, toValue(days) + 1))

	const open = useQuery(computed(() => everyTaskQuery({
		filter: `done = false && due_date < '${horizon.value.toISOString()}'`,
		sort_by: ['due_date', 'id'],
		order_by: ['asc', 'desc'],
		expand: AGENDA_EXPAND,
	})))

	const doneToday = useQuery(computed(() => everyTaskQuery({
		filter: `done = true && done_at >= '${today.value.toISOString()}'`,
		sort_by: ['done_at', 'id'],
		order_by: ['desc', 'desc'],
		expand: AGENDA_EXPAND,
	})))

	const tomorrow = computed(() => addDays(today.value, 1))
	const openTasks = computed(() => open.data.value ?? [])

	const overdue = computed(() => openTasks.value.filter(task => (getTaskDate(task.due_date)?.getTime() ?? 0) < today.value.getTime()))
	const dueToday = computed(() => [
		...openTasks.value.filter(task => {
			const due = getTaskDate(task.due_date)?.getTime() ?? 0
			return due >= today.value.getTime() && due < tomorrow.value.getTime()
		}),
		...(doneToday.data.value ?? []).filter(task => {
			const due = getTaskDate(task.due_date)
			// Finished tasks due on a later day belong to that day, not to today.
			return due === null || due.getTime() < tomorrow.value.getTime()
		}),
	])
	const upcoming = computed(() => openTasks.value
		.filter(task => (getTaskDate(task.due_date)?.getTime() ?? 0) >= tomorrow.value.getTime())
		.sort(byDue))

	return {
		overdue,
		dueToday,
		upcoming,
		isPending: computed(() => open.isPending.value),
		isError: computed(() => open.isError.value),
		refetch: () => Promise.all([open.refetch(), doneToday.refetch()]),
	}
}
