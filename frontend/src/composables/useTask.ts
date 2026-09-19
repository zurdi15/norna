import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {taskQuery} from '@/client/queries/tasks'
import {problemStatus} from '@/modules/api/problem'

export function useTask(id: MaybeRefOrGetter<number>) {
	const query = useQuery(computed(() => taskQuery(Number(toValue(id)))))

	return {
		task: query.data,
		isPending: query.isPending,
		isFetching: query.isFetching,
		error: query.error,
		// 403 means the task exists but the user can't see it; pages treat it like a missing task.
		isNotFound: computed(() => {
			const status = problemStatus(query.error.value)
			return status === 403 || status === 404
		}),
	}
}
