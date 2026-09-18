import type {RouteLocationRaw} from 'vue-router'

import {useBackdropLink} from '@/features/shell/useRouteBackdrop'

/**
 * Where a task opens: beside the page it was opened from on wide screens, which
 * stays as the backdrop (see useRouteBackdrop).
 */
export function useTaskLink() {
	const backdropLink = useBackdropLink()
	return (taskId: number): RouteLocationRaw => backdropLink({name: 'task.detail', params: {id: taskId}})
}
