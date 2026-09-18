import {infiniteQueryOptions, queryOptions, useMutation} from '@tanstack/vue-query'
import type {InfiniteData, QueryClient} from '@tanstack/vue-query'

import {
	bucketsCreate,
	bucketsDelete,
	bucketsUpdate,
	projectViewBucketsTasksList,
	taskBucketUpdate,
	tasksPositionUpdate,
} from '@/client/generated'
import type {Bucket, Task, TaskBucket, TaskCollection, TaskPosition} from '@/client/generated'
import {isClientRequestContextCurrent} from '@/client/requestContext'
import {calculateItemPosition} from '@/helpers/calculateItemPosition'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'
import {projectKeys} from './projects'
import {
	compactTaskListParams,
	fetchTaskPage,
	invalidateTaskCollections,
	nextTaskPage,
	patchTaskInCaches,
	restartCancelledTaskLoads,
	taskKeys,
	taskServerFields,
	type TaskBoardParams,
	type TaskExpand,
	type TaskListParams,
	type TaskPage,
} from './tasks'

/** Tasks loaded per bucket: the buckets endpoint applies per_page to each bucket, not to the board. */
export const TASKS_PER_BUCKET = 25

const BOARD_EXPAND: TaskExpand[] = ['comment_count', 'is_unread']

export type BoardBucket = Omit<Bucket, 'id' | 'tasks' | 'count'> & {
	id: number
	tasks: Task[]
	count: number
}

type Positioned = {id?: number, position?: number}

function byPosition<T extends Positioned>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

export function normalizeBucket(bucket: Bucket): BoardBucket {
	const tasks = bucket.tasks ?? []
	return {
		...bucket,
		id: bucket.id ?? 0,
		tasks,
		count: bucket.count ?? tasks.length,
	}
}

export function taskBoardQuery(projectId: number, viewId: number, params: TaskBoardParams = {}) {
	const query = compactTaskListParams(params)
	return queryOptions({
		queryKey: taskKeys.board(projectId, viewId, query),
		queryFn: async (): Promise<BoardBucket[]> => {
			const {data} = await projectViewBucketsTasksList({
				path: {project: projectId, view: viewId},
				query: {...query, expand: BOARD_EXPAND, per_page: TASKS_PER_BUCKET},
			})
			return byPosition((data.items ?? []).map(normalizeBucket))
		},
		enabled: projectId !== 0 && viewId > 0,
	})
}

function joinFilters(...filters: (string | undefined)[]): string {
	return filters
		.filter((filter): filter is string => Boolean(filter?.trim()))
		.map(filter => `(${filter})`)
		.join(' && ')
}

/**
 * The flat-list query for one bucket's later pages. A filter-defined bucket
 * (bucket_configuration_mode 'filter') passes its configuration: the server
 * swaps "bucket_id = N" for such a bucket's filter, but drops its search and
 * rejects an empty filter, so its filter and search are sent directly instead.
 */
export function bucketPageQuery(params: TaskBoardParams, bucketId: number, bucketFilter?: TaskCollection): TaskListParams {
	const base: TaskListParams = {
		...params,
		sort_by: ['position'],
		order_by: ['asc'],
		expand: BOARD_EXPAND,
		per_page: TASKS_PER_BUCKET,
	}
	if (bucketFilter) {
		return compactTaskListParams({
			...base,
			filter: joinFilters(params.filter, bucketFilter.filter),
			q: bucketFilter.s || params.q,
		})
	}
	return compactTaskListParams({...base, filter: joinFilters(params.filter, `bucket_id = ${bucketId}`)})
}

/** Pages 2+ of one bucket; page 1 comes with the board. Enable it once the user asks for more. */
export function bucketTasksQuery(
	projectId: number,
	viewId: number,
	params: TaskBoardParams,
	bucketId: number,
	bucketFilter?: TaskCollection,
) {
	const query = compactTaskListParams(params)
	return infiniteQueryOptions({
		queryKey: taskKeys.bucketTasks(projectId, viewId, query, bucketId),
		queryFn: async ({pageParam}) => {
			const page = await fetchTaskPage(
				{kind: 'view', projectId, viewId},
				{...bucketPageQuery(query, bucketId, bucketFilter), page: pageParam},
			)
			return {...page, items: page.items.map(task => ({...task, bucket_id: bucketId}))}
		},
		initialPageParam: 2,
		getNextPageParam: nextTaskPage,
	})
}

/** The bucket's first page plus whatever was loaded after it, without duplicates, in board order. */
export function mergeBucketTasks(bucket: BoardBucket, pages: InfiniteData<TaskPage> | undefined): Task[] {
	if (!pages) {
		return bucket.tasks
	}
	// Moves shift the server's offsets, so a later page can repeat a task the board already has.
	const seen = new Set(bucket.tasks.map(task => task.id))
	const later = pages.pages.flatMap(page => page.items).filter(task => {
		if (seen.has(task.id)) {
			return false
		}
		seen.add(task.id)
		return true
	})
	return later.length > 0 ? byPosition([...bucket.tasks, ...later]) : bucket.tasks
}

/** The position for an item dropped at `index` in `items`, which may still contain the dragged item. */
export function positionForIndex(items: readonly Positioned[], index: number, movingId?: number): number {
	const others = movingId === undefined ? items : items.filter(item => item.id !== movingId)
	return calculateItemPosition(others[index - 1]?.position ?? null, others[index]?.position ?? null)
}

// --- Cache edits -----------------------------------------------------------

function isBoard(value: unknown): value is BoardBucket[] {
	return Array.isArray(value)
}

function isBucketPages(value: unknown): value is InfiniteData<TaskPage> {
	return typeof value === 'object' && value !== null && Array.isArray((value as InfiniteData<TaskPage>).pages)
}

/** Edits every loaded board of one view; bucket page caches under the same key are left alone. */
function editBoards(client: QueryClient, projectId: number, viewId: number, edit: (buckets: BoardBucket[]) => BoardBucket[]) {
	client.setQueriesData({queryKey: taskKeys.viewBoards(projectId, viewId)}, (current: unknown) =>
		isBoard(current) ? edit(current) : undefined,
	)
}

function findBoardTask(client: QueryClient, projectId: number, viewId: number, taskId: number): Task | undefined {
	for (const [, data] of client.getQueriesData({queryKey: taskKeys.viewBoards(projectId, viewId)})) {
		const tasks = isBoard(data)
			? data.flatMap(bucket => bucket.tasks)
			: isBucketPages(data) ? data.pages.flatMap(page => page.items) : []
		const task = tasks.find(candidate => candidate.id === taskId)
		if (task) {
			return task
		}
	}
	return undefined
}

interface CardMove {
	projectId: number
	viewId: number
	taskId: number
	fromBucketId: number
	bucketId: number
	position: number
}

function moveCard(client: QueryClient, move: CardMove, card: Task) {
	const moved: Task = {...card, bucket_id: move.bucketId, position: move.position}
	const changesBucket = move.fromBucketId !== move.bucketId
	editBoards(client, move.projectId, move.viewId, buckets => {
		// Without its target bucket on the board, the card stays where it is.
		if (!buckets.some(bucket => bucket.id === move.bucketId)) {
			return buckets
		}
		return buckets.map(bucket => {
			const tasks = bucket.tasks.filter(task => task.id !== move.taskId)
			if (bucket.id === move.bucketId) {
				return {...bucket, tasks: byPosition([...tasks, moved]), count: bucket.count + (changesBucket ? 1 : 0)}
			}
			if (bucket.id === move.fromBucketId && changesBucket) {
				return {...bucket, tasks, count: Math.max(0, bucket.count - 1)}
			}
			return tasks.length === bucket.tasks.length ? bucket : {...bucket, tasks}
		})
	})
	// A card loaded through "load more" lives in its bucket's page cache instead.
	client.setQueriesData({queryKey: taskKeys.viewBoards(move.projectId, move.viewId)}, (current: unknown) => {
		if (!isBucketPages(current) || !current.pages.some(page => page.items.some(task => task.id === move.taskId))) {
			return undefined
		}
		return {...current, pages: current.pages.map(page => ({...page, items: page.items.filter(task => task.id !== move.taskId)}))}
	})
}

// --- Writes ----------------------------------------------------------------

export type MoveTaskInput = CardMove

export interface MoveTaskResult {
	/** Absent for a reorder within one bucket. */
	taskBucket?: TaskBucket
	taskPosition: TaskPosition
}

export function moveTaskMutationOptions() {
	const options = contextMutationOptions({
		mutationFn: async (move: MoveTaskInput): Promise<MoveTaskResult> => {
			// The bucket goes first: a bucket at its limit rejects with 412 before the position changed.
			const taskBucket = move.fromBucketId === move.bucketId ? undefined : (await taskBucketUpdate({
				path: {project: move.projectId, view: move.viewId, bucket: move.bucketId},
				body: {task_id: move.taskId},
			})).data
			const {data: taskPosition} = await tasksPositionUpdate({
				path: {task: move.taskId},
				body: {position: move.position, project_view_id: move.viewId},
			})
			return {taskBucket, taskPosition}
		},
		optimistic: {
			queryKeys: move => [taskKeys.viewBoards(move.projectId, move.viewId)],
			update: (move, client) => {
				const card = findBoardTask(client, move.projectId, move.viewId, move.taskId)
				if (card) {
					moveCard(client, move, card)
				}
				return {card}
			},
		},
		onSuccess: ({taskBucket, taskPosition}, move, client, {card}) => {
			const bucketId = taskBucket?.bucket_id ?? move.bucketId
			const position = taskPosition.position ?? move.position
			// A repeating task moved into the done bucket reopens and lands back in the default bucket.
			const rerouted = bucketId !== move.bucketId
			if (card && (rerouted || position !== move.position)) {
				moveCard(client, {...move, fromBucketId: move.bucketId, bucketId, position}, {...card, position})
			}
			const serverTask = taskBucket?.task
			if (serverTask) {
				patchTaskInCaches(client, move.taskId, taskServerFields(serverTask))
			}
			// A position other than the one sent means the server renumbered the whole view.
			if (rerouted || position !== move.position) {
				void client.invalidateQueries({queryKey: taskKeys.viewBoards(move.projectId, move.viewId)})
			}
			if (serverTask && card && serverTask.done !== card.done) {
				void invalidateTaskCollections(client, ['done'])
			}
		},
		// Moving into a done bucket also moves the task in every other kanban view of the project.
		onSettled: (_move, client) => Promise.all([
			client.invalidateQueries({queryKey: taskKeys.boards(), refetchType: 'none'}),
			restartCancelledTaskLoads(client),
		]),
	})
	return {
		...options,
		onError: (...args: Parameters<NonNullable<typeof options.onError>>) => {
			const [, move, context, {client}] = args
			options.onError?.(...args)
			// The bucket may have changed before the position request failed, so show what the server has.
			if (context && isClientRequestContextCurrent(context.request)) {
				void client.invalidateQueries({queryKey: taskKeys.viewBoards(move.projectId, move.viewId)})
			}
		},
	}
}

export interface CreateBucketInput {
	projectId: number
	viewId: number
	bucket: {title: string, limit?: number, position?: number}
}

export function createBucketMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({projectId, viewId, bucket}: CreateBucketInput) => {
			const {data} = await bucketsCreate({path: {project: projectId, view: viewId}, body: bucket})
			return normalizeBucket(data)
		},
		onSuccess: (created, {projectId, viewId}, client) => {
			editBoards(client, projectId, viewId, buckets =>
				byPosition([...buckets.filter(bucket => bucket.id !== created.id), created]),
			)
		},
		onSettled: ({projectId, viewId}, client) =>
			client.invalidateQueries({queryKey: taskKeys.viewBoards(projectId, viewId), refetchType: 'none'}),
	})
}

export interface UpdateBucketInput {
	projectId: number
	viewId: number
	/** PUT replaces title, limit and position together. */
	bucket: {id: number, title: string, limit: number, position: number}
}

export function updateBucketMutationOptions(successMessage?: () => string) {
	return contextMutationOptions({
		mutationFn: async ({projectId, viewId, bucket: {id, ...bucket}}: UpdateBucketInput) => {
			const {data} = await bucketsUpdate({path: {project: projectId, view: viewId, bucket: id}, body: bucket})
			return data
		},
		optimistic: {
			queryKeys: ({projectId, viewId}) => [taskKeys.viewBoards(projectId, viewId)],
			update: ({projectId, viewId, bucket}, client) => {
				editBoards(client, projectId, viewId, buckets => byPosition(buckets.map(existing =>
					existing.id === bucket.id ? {...existing, ...bucket} : existing,
				)))
			},
		},
		onSuccess: (updated, {projectId, viewId, bucket}, client) => {
			editBoards(client, projectId, viewId, buckets => byPosition(buckets.map(existing =>
				existing.id === bucket.id
					? {
						...existing,
						title: updated.title ?? existing.title,
						limit: updated.limit ?? existing.limit,
						position: updated.position ?? existing.position,
					}
					: existing,
			)))
		},
		onSettled: ({projectId, viewId}, client) => Promise.all([
			client.invalidateQueries({queryKey: taskKeys.viewBoards(projectId, viewId), refetchType: 'none'}),
			restartCancelledTaskLoads(client),
		]),
		successMessage: () => successMessage?.(),
	})
}

export function renameBucketMutationOptions() {
	return updateBucketMutationOptions(() => translate('project.kanban.bucketTitleSavedSuccess'))
}

export function setBucketLimitMutationOptions() {
	return updateBucketMutationOptions(() => translate('project.kanban.bucketLimitSavedSuccess'))
}

export interface DeleteBucketInput {
	projectId: number
	viewId: number
	bucketId: number
}

export function deleteBucketMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({projectId, viewId, bucketId}: DeleteBucketInput) => {
			await bucketsDelete({path: {project: projectId, view: viewId, bucket: bucketId}})
		},
		optimistic: {
			queryKeys: ({projectId, viewId}) => [taskKeys.viewBoards(projectId, viewId)],
			update: ({projectId, viewId, bucketId}, client) => {
				editBoards(client, projectId, viewId, buckets => buckets.filter(bucket => bucket.id !== bucketId))
			},
		},
		// Its tasks moved to the default bucket, and the view's default or done bucket may have been reset.
		onSettled: ({projectId, viewId}, client) => Promise.all([
			client.invalidateQueries({queryKey: taskKeys.viewBoards(projectId, viewId)}),
			client.invalidateQueries({queryKey: projectKeys.detail(projectId)}),
			client.invalidateQueries({queryKey: projectKeys.list(), refetchType: 'none'}),
		]),
		successMessage: () => translate('project.kanban.deleteBucketSuccess'),
	})
}

export function useMoveTaskMutation() {
	return useMutation(moveTaskMutationOptions())
}

export function useCreateBucketMutation() {
	return useMutation(createBucketMutationOptions())
}

export function useRenameBucketMutation() {
	return useMutation(renameBucketMutationOptions())
}

export function useSetBucketLimitMutation() {
	return useMutation(setBucketLimitMutationOptions())
}

export function useReorderBucketMutation() {
	return useMutation(updateBucketMutationOptions())
}

export function useDeleteBucketMutation() {
	return useMutation(deleteBucketMutationOptions())
}
