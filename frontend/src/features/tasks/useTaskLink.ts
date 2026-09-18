import {useRoute, type RouteLocationRaw} from 'vue-router'

/**
 * Where a task opens. The page it was opened from travels in history.state as the
 * backdrop, so wide screens keep it visible behind the detail panel; moving between
 * tasks inside the panel keeps that backdrop and replaces the entry.
 */
export function useTaskLink() {
	const route = useRoute()

	return (taskId: number): RouteLocationRaw => {
		const onDetail = route.name === 'task.detail'
		const backdropView: string | undefined = onDetail ? window.history.state?.backdropView : route.fullPath
		return {
			name: 'task.detail',
			params: {id: taskId},
			state: backdropView ? {backdropView} : undefined,
			replace: onDetail && backdropView !== undefined,
		}
	}
}
