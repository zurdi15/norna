import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useInfiniteQuery} from '@tanstack/vue-query'

import {flattenComments, taskCommentsQuery, type CommentOrder} from '@/client/queries/taskComments'

export function useTaskComments(taskId: MaybeRefOrGetter<number>, order: MaybeRefOrGetter<CommentOrder> = 'asc') {
	const query = useInfiniteQuery(computed(() => taskCommentsQuery(Number(toValue(taskId)), toValue(order))))

	return {
		comments: computed(() => flattenComments(query.data.value)),
		total: computed(() => query.data.value?.pages[0]?.total ?? 0),
		hasMore: query.hasNextPage,
		isPending: query.isPending,
		isLoadingMore: query.isFetchingNextPage,
		loadMore: () => query.fetchNextPage(),
	}
}
