import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useInfiniteQuery, useQuery} from '@tanstack/vue-query'

import type {TaskCollection} from '@/client/generated'
import {
	bucketTasksQuery,
	mergeBucketTasks,
	taskBoardQuery,
	type BoardBucket,
} from '@/client/queries/taskBoard'
import type {TaskBoardParams} from '@/client/queries/tasks'

export function useTaskBoard(
	projectId: MaybeRefOrGetter<number>,
	viewId: MaybeRefOrGetter<number>,
	params: MaybeRefOrGetter<TaskBoardParams> = {},
) {
	const query = useQuery(computed(() => taskBoardQuery(toValue(projectId), toValue(viewId), toValue(params))))

	return {
		buckets: computed(() => query.data.value ?? []),
		isPending: query.isPending,
		isFetching: query.isFetching,
		error: query.error,
		refetch: query.refetch,
	}
}

interface BucketTasksOptions {
	projectId: MaybeRefOrGetter<number>
	viewId: MaybeRefOrGetter<number>
	params?: MaybeRefOrGetter<TaskBoardParams>
	bucket: MaybeRefOrGetter<BoardBucket>
	/** The bucket's configuration when the view defines buckets by filter. */
	bucketFilter?: MaybeRefOrGetter<TaskCollection | undefined>
}

/** One bucket's cards: the board's first page, plus the pages loadMore() fetched after it. */
export function useBucketTasks(options: BucketTasksOptions) {
	const bucket = computed(() => toValue(options.bucket))
	// Page 1 came with the board, so later pages stay unrequested until the user asks.
	const requested = ref(false)
	watch(() => bucket.value.id, () => {
		requested.value = false
	})

	const query = useInfiniteQuery(computed(() => ({
		...bucketTasksQuery(
			toValue(options.projectId),
			toValue(options.viewId),
			toValue(options.params) ?? {},
			bucket.value.id,
			toValue(options.bucketFilter),
		),
		enabled: requested.value,
	})))

	const tasks = computed(() => mergeBucketTasks(bucket.value, requested.value ? query.data.value : undefined))
	const hasMore = computed(() => requested.value && query.data.value
		? query.hasNextPage.value
		: bucket.value.count > bucket.value.tasks.length)

	async function loadMore() {
		if (!hasMore.value || query.isFetching.value) {
			return
		}
		if (!requested.value) {
			requested.value = true
			return
		}
		await query.fetchNextPage()
	}

	return {
		tasks,
		hasMore,
		isLoadingMore: query.isFetching,
		loadMore,
	}
}
