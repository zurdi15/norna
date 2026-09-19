import {infiniteQueryOptions, queryOptions, useMutation} from '@tanstack/vue-query'
import type {QueryClient, QueryKey} from '@tanstack/vue-query'

import {
	labelsCreate,
	patchTasksRead,
	projectTasksList,
	projectViewTasksList,
	taskLabelsBulkReplace,
	tasksBulkCreate,
	tasksBulkUpdate,
	tasksCreate,
	tasksDelete,
	tasksDuplicate,
	tasksList,
	tasksMarkRead,
	tasksPositionUpdate,
	tasksRead,
	tasksUpdate,
} from '@/client/generated'
import type {
	JsonPatchOp,
	Label,
	PaginatedTask,
	Task,
	TaskReadOneBody,
	TasksListData,
} from '@/client/generated'
import {queryClient} from '@/client/queryClient'
import {colorFromHex} from '@/helpers/color/colorFromHex'
import {getRandomColorHex} from '@/helpers/color/randomColor'
import {translate} from '@/i18n'
import {error} from '@/message'
import {problemStatus} from '@/modules/api/problem'
import {parseTaskText} from '@/modules/quickAddMagic'
import type {PrefixMode} from '@/modules/quickAddMagic/prefixes'
import type {QuickAddDefaultReminder} from '@/modules/settings/userSettings'
import {
	buildTaskFromQuickAdd,
	matchQuickAddAssignee,
	partitionQuickAddLabels,
	resolveQuickAddProjectId,
	type QuickAddAssignee,
	type QuickAddTask,
} from '@/modules/task/quickAdd'
import {normalizeTaskInput, type TaskInput} from '@/modules/task/task'

import {contextMutationOptions} from './contextMutation'
import {fetchAllPages} from './fetchAllPages'
import {ensureLabels, labelKeys, refreshLabels} from './labels'
import {ensureProjects, getCachedProject, projectKeys} from './projects'
import {searchProjectUsers} from './userSearch'

export type TaskExpand = NonNullable<NonNullable<TasksListData['query']>['expand']>[number]

export type TaskListScope =
	| {kind: 'all'}
	| {kind: 'project', projectId: number}
	| {kind: 'view', projectId: number, viewId: number}

/** Query params shared by every task list endpoint. The search term is `q` (v1 called it `s`). */
export interface TaskListParams {
	q?: string
	filter?: string
	filter_timezone?: string
	filter_include_nulls?: boolean
	sort_by?: string[]
	order_by?: string[]
	expand?: TaskExpand[]
	page?: number
	per_page?: number
}

export type TaskBoardParams = Pick<TaskListParams, 'q' | 'filter' | 'filter_timezone' | 'filter_include_nulls'>

export interface TaskPage {
	items: Task[]
	page: number
	per_page: number
	total: number
	total_pages: number
}

export type TaskDetail = TaskReadOneBody

// Every task-shaped cache lives under ['tasks'], so one prefix reaches all of them.
export const taskKeys = {
	all: ['tasks'] as const,
	detail: (id: number) => ['tasks', 'detail', id] as const,
	lists: () => ['tasks', 'list'] as const,
	list: (scope: TaskListScope, params: TaskListParams) => ['tasks', 'list', scope, params] as const,
	infiniteList: (scope: TaskListScope, params: TaskListParams) => ['tasks', 'list', scope, params, 'infinite'] as const,
	boards: () => ['tasks', 'board'] as const,
	viewBoards: (projectId: number, viewId: number) => ['tasks', 'board', projectId, viewId] as const,
	board: (projectId: number, viewId: number, params: TaskBoardParams) =>
		['tasks', 'board', projectId, viewId, params] as const,
	bucketTasks: (projectId: number, viewId: number, params: TaskBoardParams, bucketId: number) =>
		['tasks', 'board', projectId, viewId, params, bucketId] as const,
	everyPage: (params: TaskListParams) => ['tasks', 'list', {kind: 'all'}, params, 'every'] as const,
}

export const TASKS_PER_PAGE = 50

const TASK_DETAIL_EXPAND: TaskExpand[] = ['reactions', 'comment_count', 'is_unread', 'buckets', 'time_entries_count']

// Mirrors models.MaxTasksPerBulkCreation on the backend.
const MAX_TASKS_PER_BULK_CREATION = 100

export function toTaskPage(data: PaginatedTask): TaskPage {
	return {
		items: data.items ?? [],
		page: data.page ?? 1,
		per_page: data.per_page ?? 0,
		total: data.total ?? 0,
		total_pages: data.total_pages ?? 1,
	}
}

/** Drops empty values, so they neither reach the url nor split one list into two cache entries. */
export function compactTaskListParams<T extends TaskListParams>(params: T): T {
	return Object.fromEntries(Object.entries(params).filter(([, value]) =>
		value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
	)) as T
}

function isLoadableScope(scope: TaskListScope): boolean {
	switch (scope.kind) {
		case 'all':
			return true
		case 'project':
			return scope.projectId !== 0
		case 'view':
			return scope.projectId !== 0 && scope.viewId > 0
	}
}

export async function fetchTaskPage(scope: TaskListScope, query: TaskListParams): Promise<TaskPage> {
	switch (scope.kind) {
		case 'all':
			return toTaskPage((await tasksList({query})).data)
		case 'project':
			return toTaskPage((await projectTasksList({path: {project: scope.projectId}, query})).data)
		case 'view':
			return toTaskPage((await projectViewTasksList({
				path: {project: scope.projectId, view: scope.viewId},
				query,
			})).data)
	}
}

export function nextTaskPage(last: TaskPage): number | undefined {
	return last.page < last.total_pages ? last.page + 1 : undefined
}

function isPermanentError(cause: unknown): boolean {
	const status = problemStatus(cause)
	return status === 403 || status === 404
}

export function taskQuery(id: number) {
	return queryOptions({
		queryKey: taskKeys.detail(id),
		queryFn: async (): Promise<TaskDetail> =>
			(await tasksRead({path: {task: id}, query: {expand: TASK_DETAIL_EXPAND}})).data,
		enabled: id > 0,
		// A task the user can't see won't show up on a retry.
		retry: (failureCount, cause) => !isPermanentError(cause) && failureCount < 1,
	})
}

export function ensureTask(id: number): Promise<TaskDetail> {
	return queryClient.ensureQueryData(taskQuery(id))
}

export function taskListQuery(scope: TaskListScope, params: TaskListParams = {}) {
	const query = compactTaskListParams(params)
	return queryOptions({
		queryKey: taskKeys.list(scope, query),
		queryFn: () => fetchTaskPage(scope, query),
		enabled: isLoadableScope(scope),
	})
}

/** Pages appended one after another, for lists that load more on scroll. */
export function infiniteTaskListQuery(scope: TaskListScope, params: Omit<TaskListParams, 'page'> = {}) {
	const query = compactTaskListParams({per_page: TASKS_PER_PAGE, ...params})
	return infiniteQueryOptions({
		queryKey: taskKeys.infiniteList(scope, query),
		queryFn: ({pageParam}) => fetchTaskPage(scope, {...query, page: pageParam}),
		initialPageParam: 1,
		getNextPageParam: nextTaskPage,
		enabled: isLoadableScope(scope),
	})
}

/** Every task matching the params, all pages loaded: for agenda views that group the whole set. */
export function everyTaskQuery(params: Omit<TaskListParams, 'page'>) {
	const query = compactTaskListParams(params)
	return queryOptions({
		queryKey: taskKeys.everyPage(query),
		queryFn: () => fetchAllPages(async page => toTaskPage((await tasksList({query: {...query, page}})).data)),
	})
}

// --- Cache edits -----------------------------------------------------------

/** Returns the same task when nothing changes, or null to drop it from lists. */
type TaskEdit = (task: Task) => Task | null

type Bucketish = {tasks: Task[], count?: number}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isBucket(value: unknown): value is Bucketish {
	return isRecord(value) && Array.isArray(value.tasks)
}

function isTaskPage(value: unknown): value is {items: Task[], total?: number} {
	return isRecord(value) && Array.isArray(value.items)
}

function isInfinitePages(value: unknown): value is {pages: unknown[], pageParams: unknown[]} {
	return isRecord(value) && Array.isArray(value.pages) && Array.isArray(value.pageParams)
}

function editTaskList(tasks: Task[], edit: TaskEdit, embedded: boolean): Task[] {
	let changed = false
	const next: Task[] = []
	for (const task of tasks) {
		const edited = editTask(task, edit, embedded)
		changed ||= edited !== task
		if (edited) {
			next.push(edited)
		}
	}
	return changed ? next : tasks
}

// Related tasks are copies embedded in their neighbours, so a done or renamed subtask shows up in its parent too.
function editTask(task: Task, edit: TaskEdit, embedded: boolean): Task | null {
	const edited = edit(task)
	const related = edited?.related_tasks
	if (!embedded || !edited || !related) {
		return edited
	}
	let changed = false
	const nextRelated: NonNullable<Task['related_tasks']> = {}
	for (const [kind, tasks] of Object.entries(related)) {
		// One level only: the copies' own relations are not loaded.
		const next = tasks ? editTaskList(tasks, edit, false) : tasks
		changed ||= next !== tasks
		nextRelated[kind] = next
	}
	return changed ? {...edited, related_tasks: nextRelated} : edited
}

function editBucket<T extends Bucketish>(bucket: T, edit: TaskEdit, embedded: boolean): T {
	const tasks = editTaskList(bucket.tasks, edit, embedded)
	if (tasks === bucket.tasks) {
		return bucket
	}
	const removed = bucket.tasks.length - tasks.length
	return {
		...bucket,
		tasks,
		...(removed > 0 && typeof bucket.count === 'number' ? {count: Math.max(0, bucket.count - removed)} : {}),
	}
}

function editTaskPage<T extends {items: Task[], total?: number}>(page: T, edit: TaskEdit, embedded: boolean): T {
	const items = editTaskList(page.items, edit, embedded)
	if (items === page.items) {
		return page
	}
	const removed = page.items.length - items.length
	return {
		...page,
		items,
		...(removed > 0 && typeof page.total === 'number' ? {total: Math.max(0, page.total - removed)} : {}),
	}
}

export interface TaskCacheEditOptions {
	/** Also edit the copies embedded as related tasks. Off for edits of the relations themselves. */
	embedded?: boolean
}

/**
 * Applies an edit to every task inside one cached value, whatever its shape: a
 * single task (detail), a page of tasks, infinite pages, or buckets with tasks.
 * Returns the value itself when nothing changed.
 */
export function editTasksInShape(data: unknown, edit: TaskEdit, {embedded = true}: TaskCacheEditOptions = {}): unknown {
	if (!isRecord(data)) {
		return data
	}
	if (Array.isArray(data)) {
		if (data.every(isBucket)) {
			const next = data.map(bucket => editBucket(bucket, edit, embedded))
			return next.some((bucket, index) => bucket !== data[index]) ? next : data
		}
		return editTaskList(data as Task[], edit, embedded)
	}
	if (isInfinitePages(data)) {
		const pages = data.pages.map(page => editTasksInShape(page, edit, {embedded}))
		return pages.some((page, index) => page !== data.pages[index]) ? {...data, pages} : data
	}
	if (isTaskPage(data)) {
		return editTaskPage(data, edit, embedded)
	}
	if (typeof data.id === 'number') {
		// A detail stays cached when its task is removed; deletes drop it explicitly.
		return editTask(data as Task, edit, embedded) ?? data
	}
	return data
}

export function editTaskCaches(client: QueryClient, edit: TaskEdit, options: TaskCacheEditOptions & {queryKey?: QueryKey} = {}): void {
	client.setQueriesData({queryKey: options.queryKey ?? taskKeys.all}, (current: unknown) => {
		const next = editTasksInShape(current, edit, options)
		// undefined leaves the query alone: handing back the same data would still reset its staleness.
		return next === current ? undefined : next
	})
}

export type TaskChange = Partial<Task> | ((task: Task) => Task)

/** Updates one task in every cached shape under ['tasks']. Only for mutation callbacks. */
export function patchTaskInCaches(client: QueryClient, id: number, change: TaskChange, options?: TaskCacheEditOptions): void {
	const apply = typeof change === 'function' ? change : (task: Task) => ({...task, ...change})
	editTaskCaches(client, task => task.id === id ? apply(task) : task, options)
}

/** Drops one task from every cached list, page and bucket. Only for mutation callbacks. */
export function removeTaskFromCaches(client: QueryClient, id: number): void {
	editTaskCaches(client, task => task.id === id ? null : task)
}

// View-specific (position, bucket_id) and expand-only fields are absent or zero in write responses.
const SERVER_FIELDS = [
	'title',
	'description',
	'done',
	'done_at',
	'due_date',
	'start_date',
	'end_date',
	'reminders',
	'repeat_after',
	'repeat_mode',
	'priority',
	'hex_color',
	'percent_done',
	'project_id',
	'cover_image_attachment_id',
	'is_favorite',
	'identifier',
	'index',
	'updated',
] as const satisfies readonly (keyof Task)[]

/** The fields of a write response that may replace what the caches hold. */
export function taskServerFields(task: Task): Partial<Task> {
	const fields: Record<string, unknown> = {}
	for (const key of SERVER_FIELDS) {
		if (task[key] !== undefined) {
			fields[key] = task[key]
		}
	}
	return fields as Partial<Task>
}

// Fields that decide which lists and buckets a task belongs to, or where it sorts.
const MEMBERSHIP_FIELDS = new Set([
	'done',
	'due_date',
	'start_date',
	'end_date',
	'priority',
	'project_id',
	'bucket_id',
	'is_favorite',
	'labels',
	'assignees',
])

export function invalidateTaskCollections(client: QueryClient, changedFields: readonly string[] | 'all') {
	const changesMembership = changedFields === 'all' || changedFields.some(field => MEMBERSHIP_FIELDS.has(field))
	// Deliberately 'active' on membership changes, unlike the usual 'none' for expensive lists:
	// a task marked done would otherwise stay in a list filtered to open tasks.
	const refetchType = changesMembership ? 'active' : 'none'
	return Promise.all([
		client.invalidateQueries({queryKey: taskKeys.lists(), refetchType}),
		client.invalidateQueries({queryKey: taskKeys.boards(), refetchType}),
		refetchType === 'none' && restartCancelledTaskLoads(client),
	])
}

/**
 * Optimistic updates cancel the task loads in flight, and a cancelled first load
 * is left with nothing to show; an invalidation with refetchType 'none' would
 * never start it again.
 */
export function restartCancelledTaskLoads(client: QueryClient) {
	return client.refetchQueries({
		queryKey: taskKeys.all,
		type: 'active',
		predicate: query => query.state.status === 'pending' && query.state.fetchStatus === 'idle',
	})
}

export function invalidateTask(client: QueryClient, id: number) {
	return client.invalidateQueries({queryKey: taskKeys.detail(id)})
}

// --- Writes ----------------------------------------------------------------

/** Writable fields for PATCH; dates may be Date objects, and null clears them. */
export type TaskPatch = TaskInput

export interface PatchTaskInput {
	id: number
	patch: TaskPatch
}

export function taskPatchOperations(patch: TaskPatch): JsonPatchOp[] {
	return Object.entries(normalizeTaskInput(patch))
		.filter(([, value]) => value !== undefined)
		.map(([field, value]) => ({op: 'replace', path: `/${field}`, value}))
}

async function sendTaskPatch({id, patch}: PatchTaskInput): Promise<Task | undefined> {
	const result = await patchTasksRead({
		path: {task: id},
		body: taskPatchOperations(patch),
		throwOnError: false,
	})
	// AutoPatch answers a patch that changes nothing with an empty 304, which the client reports as an error.
	if (result.response?.status === 304) {
		return undefined
	}
	if (result.error !== undefined) {
		throw result.error
	}
	return result.data
}

export type TaskMessage<TInput> = (input: TInput) => string | undefined

export function defaultPatchMessage({patch}: PatchTaskInput): string | undefined {
	if (patch.done !== undefined) {
		return translate(patch.done ? 'task.doneSuccess' : 'task.undoneSuccess')
	}
	return translate('task.detail.updateSuccess')
}

/** A PATCH of one task with a full optimistic flow; specific edits map their input to the patch. */
export function taskPatchMutationOptions<TInput>(options: {
	toPatch: (input: TInput) => PatchTaskInput
	successMessage?: TaskMessage<TInput>
	invalidate?: (input: TInput, client: QueryClient) => Promise<unknown>
}) {
	return contextMutationOptions({
		mutationFn: (input: TInput) => sendTaskPatch(options.toPatch(input)),
		optimistic: {
			queryKeys: () => [taskKeys.all],
			update: (input, client) => {
				const {id, patch} = options.toPatch(input)
				patchTaskInCaches(client, id, normalizeTaskInput(patch) as Partial<Task>)
			},
		},
		onSuccess: (updated, input, client) => {
			if (updated) {
				patchTaskInCaches(client, options.toPatch(input).id, taskServerFields(updated))
			}
		},
		onSettled: (input, client) => {
			const {id, patch} = options.toPatch(input)
			return Promise.all([
				invalidateTaskCollections(client, Object.keys(patch)),
				invalidateTask(client, id),
				options.invalidate?.(input, client),
			])
		},
		successMessage: (_updated, input) => options.successMessage?.(input),
	})
}

/** Edits single fields through PATCH, which never touches the fields it doesn't name. */
export function patchTaskMutationOptions(successMessage: TaskMessage<PatchTaskInput> = defaultPatchMessage) {
	return taskPatchMutationOptions<PatchTaskInput>({toPatch: input => input, successMessage})
}

export function toggleTaskFavoriteMutationOptions() {
	return taskPatchMutationOptions<{id: number, isFavorite: boolean}>({
		toPatch: ({id, isFavorite}) => ({id, patch: {is_favorite: isFavorite}}),
		// Favorites is a pseudo project that only exists while something is favorited.
		invalidate: (_input, client) => client.invalidateQueries({queryKey: projectKeys.list()}),
	})
}

export function moveTaskToProjectMutationOptions() {
	return taskPatchMutationOptions<{id: number, projectId: number}>({
		toPatch: ({id, projectId}) => ({id, patch: {project_id: projectId}}),
		successMessage: ({projectId}) => translate('task.movedToProject', {
			project: getCachedProject(projectId)?.title ?? translate('project.title'),
		}),
	})
}

type FullTaskFields =
	| 'title'
	| 'description'
	| 'done'
	| 'due_date'
	| 'start_date'
	| 'end_date'
	| 'reminders'
	| 'repeat_after'
	| 'repeat_mode'
	| 'priority'
	| 'hex_color'
	| 'percent_done'
	| 'project_id'
	| 'cover_image_attachment_id'
	| 'is_favorite'

/** PUT replaces every field, so a full edit form must send all of them. */
export type UpdateTaskInput = Required<Pick<TaskInput, FullTaskFields>> & Pick<TaskInput, 'bucket_id'> & {id: number}

export function updateTaskMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({id, ...task}: UpdateTaskInput) => {
			const {data} = await tasksUpdate({path: {task: id}, body: normalizeTaskInput(task)})
			return data
		},
		onSuccess: (updated, {id}, client) => {
			patchTaskInCaches(client, id, taskServerFields(updated))
		},
		onSettled: ({id}, client) => Promise.all([
			invalidateTaskCollections(client, 'all'),
			invalidateTask(client, id),
		]),
		successMessage: () => translate('task.detail.updateSuccess'),
	})
}

export type CreateTaskInput = {
	projectId: number
	task: TaskInput & {title: string}
}

export function createTaskMutationOptions(successMessage?: TaskMessage<CreateTaskInput>) {
	return contextMutationOptions({
		mutationFn: async ({projectId, task}: CreateTaskInput) => {
			const {data} = await tasksCreate({path: {project: projectId}, body: normalizeTaskInput(task)})
			return data
		},
		onSettled: (_input, client) => invalidateTaskCollections(client, 'all'),
		successMessage: (_created, input) => successMessage?.(input),
	})
}

export function deleteTaskMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			await tasksDelete({path: {task: id}})
		},
		optimistic: {
			queryKeys: () => [taskKeys.all],
			update: (id, client) => removeTaskFromCaches(client, id),
		},
		onSuccess: (_data, id, client) => {
			client.removeQueries({queryKey: taskKeys.detail(id), exact: true})
		},
		onSettled: (_id, client) => invalidateTaskCollections(client, []),
		successMessage: () => translate('task.detail.deleteSuccess'),
	})
}

export function duplicateTaskMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			const {data} = await tasksDuplicate({path: {task: id}})
			if (!data.duplicated_task) {
				throw new Error('Task duplicate response is missing the duplicated task')
			}
			return data.duplicated_task
		},
		// The original gains a "copied to" relation.
		onSettled: (id, client) => Promise.all([
			invalidateTaskCollections(client, 'all'),
			invalidateTask(client, id),
		]),
		successMessage: () => translate('task.detail.duplicateSuccess'),
	})
}

export function markTaskReadMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (id: number) => {
			await tasksMarkRead({path: {task: id}})
		},
		onSuccess: (_data, id, client) => patchTaskInCaches(client, id, {is_unread: false}),
		onSettled: (_id, client) => client.invalidateQueries({queryKey: taskKeys.all, refetchType: 'none'}),
		toastError: () => false,
	})
}

export interface UpdateTaskPositionInput {
	taskId: number
	viewId: number
	position: number
}

/** Reorders a task inside a list view. Board moves go through taskBoard.ts, which also changes buckets. */
export function updateTaskPositionMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({taskId, viewId, position}: UpdateTaskPositionInput) => {
			const {data} = await tasksPositionUpdate({path: {task: taskId}, body: {position, project_view_id: viewId}})
			return data
		},
		// Positions belong to a view, so only list caches take the new one; boards keep theirs.
		optimistic: {
			queryKeys: () => [taskKeys.lists()],
			update: ({taskId, position}, client) => {
				editTaskCaches(client, task => task.id === taskId ? {...task, position} : task, {queryKey: taskKeys.lists(), embedded: false})
			},
		},
		// The server may renumber the whole view; the active list reloads in its order.
		onSettled: (_input, client) => client.invalidateQueries({queryKey: taskKeys.lists()}),
	})
}

export interface BulkUpdateTasksInput {
	ids: number[]
	patch: TaskPatch
}

export function bulkUpdateTasksMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({ids, patch}: BulkUpdateTasksInput) => {
			const values = normalizeTaskInput(patch)
			const {data} = await tasksBulkUpdate({body: {task_ids: ids, fields: Object.keys(values), values}})
			return data.tasks ?? []
		},
		optimistic: {
			queryKeys: () => [taskKeys.all],
			update: ({ids, patch}, client) => {
				const values = normalizeTaskInput(patch) as Partial<Task>
				const selected = new Set(ids)
				editTaskCaches(client, task => task.id !== undefined && selected.has(task.id) ? {...task, ...values} : task)
			},
		},
		onSuccess: (updated, _input, client) => {
			const byId = new Map(updated.map(task => [task.id, taskServerFields(task)]))
			editTaskCaches(client, task => {
				const fields = byId.get(task.id)
				return fields ? {...task, ...fields} : task
			})
		},
		onSettled: ({ids, patch}, client) => Promise.all([
			invalidateTaskCollections(client, Object.keys(patch)),
			...ids.map(id => invalidateTask(client, id)),
		]),
	})
}

// --- Quick add -------------------------------------------------------------

export interface QuickAddSettings {
	magicMode: PrefixMode
	defaultReminders?: readonly QuickAddDefaultReminder[]
	/** Labels picked outside the text, such as the task type; they go on every task. */
	labels?: readonly Label[]
}

export interface QuickAddTaskInput extends QuickAddSettings {
	title: string
	/** The current project, or the user's default one; used when the text names no project. */
	projectId: number
	bucketId?: number
	position?: number
}

export interface QuickAddTaskResult {
	task: Task
	createdLabels: Label[]
	/** Set when the task was created but attaching its labels failed. */
	labelError?: unknown
}

export interface QuickAddTasksInput extends QuickAddSettings {
	entries: {title: string, projectId: number}[]
}

export interface QuickAddTasksResult {
	/** Aligned 1:1 with the entries; null for an entry that was not created. */
	tasks: (Task | null)[]
	createdLabels: Label[]
	error: unknown | null
	labelError?: unknown
}

export class ProjectRequiredError extends Error {
	constructor() {
		super(translate('project.create.addProjectRequired'))
		this.name = 'ProjectRequiredError'
	}
}

function requireProject(projectId: number | null): number {
	if (projectId === null || projectId <= 0) {
		throw new ProjectRequiredError()
	}
	return projectId
}

async function findQuickAddAssignees(queries: string[], projectId: number): Promise<QuickAddAssignee[]> {
	const matches = await Promise.all(queries.map(async query => {
		try {
			const user = matchQuickAddAssignee(await searchProjectUsers(projectId, query), query)
			return user ? {user, match: query} : null
		} catch (cause) {
			// An unknown assignee stays in the title, the same as one the search doesn't find.
			console.debug('Could not search quick add assignee', {query, cause})
			return null
		}
	}))
	return matches.filter((match): match is QuickAddAssignee => match !== null)
}

type QuickAddPlacement = QuickAddSettings & Pick<QuickAddTaskInput, 'bucketId' | 'position'>

async function buildQuickAddTask(title: string, projectId: number, placement: QuickAddPlacement) {
	const input = {
		title,
		magicMode: placement.magicMode,
		defaultReminders: placement.defaultReminders,
		bucketId: placement.bucketId,
		position: placement.position,
	}
	const parsed = parseTaskText(title, input.magicMode)
	if (parsed.text === '') {
		return buildTaskFromQuickAdd({...input, parsed, projectId: requireProject(projectId)})
	}
	const {projects} = await ensureProjects()
	const resolvedProjectId = requireProject(resolveQuickAddProjectId(parsed.project, projects, projectId))
	const assignees = await findQuickAddAssignees(parsed.assignees, resolvedProjectId)
	return buildTaskFromQuickAdd({...input, parsed, projectId: resolvedProjectId, assignees})
}

/** The labels with these titles, creating the missing ones. Labels that can't be created are skipped. */
async function ensureQuickAddLabels(titles: string[]): Promise<{labels: Label[], created: Label[]}> {
	if (titles.length === 0) {
		return {labels: [], created: []}
	}
	let available: Label[] = []
	let loaded = false
	try {
		available = await ensureLabels()
		loaded = true
	} catch (cause) {
		console.debug('Could not load labels before creating them from quick add', cause)
	}
	if (loaded && partitionQuickAddLabels(available, titles).missing.length > 0) {
		try {
			available = await refreshLabels()
		} catch (cause) {
			console.debug('Could not refresh labels before creating them from quick add', cause)
		}
	}

	const {found, missing} = partitionQuickAddLabels(available, titles)
	const created = await Promise.all(missing.map(async title => {
		try {
			return (await labelsCreate({body: {title, hex_color: colorFromHex(getRandomColorHex())}})).data
		} catch (cause) {
			// Link shares may not create labels; skip the label instead of failing the task.
			console.debug('Could not create label from quick add', {title, cause})
			return null
		}
	}))
	const createdLabels = created.filter((label): label is Label => label !== null)
	return {labels: [...found, ...createdLabels], created: createdLabels}
}

async function attachLabels(task: Task, fromText: Label[], picked: readonly Label[] = []): Promise<Task> {
	const labels = [...fromText, ...picked.filter(label => !fromText.some(other => other.id === label.id))]
	if (labels.length === 0 || typeof task.id !== 'number') {
		return task
	}
	const {data} = await taskLabelsBulkReplace({path: {task: task.id}, body: {labels}})
	return {...task, labels: data.labels ?? labels}
}

function addCreatedLabels(client: QueryClient, created: Label[]) {
	if (created.length === 0) {
		return
	}
	client.setQueryData<Label[]>(labelKeys.all, current => current
		? [...current, ...created.filter(label => !current.some(existing => existing.id === label.id))]
		: current,
	)
}

export function quickAddTaskMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (input: QuickAddTaskInput): Promise<QuickAddTaskResult> => {
			const {task, labels: titles} = await buildQuickAddTask(input.title, input.projectId, input)
			const {data: created} = await tasksCreate({path: {project: task.project_id ?? input.projectId}, body: task})
			const {labels, created: createdLabels} = await ensureQuickAddLabels(titles)
			try {
				return {task: await attachLabels(created, labels, input.labels), createdLabels}
			} catch (labelError) {
				// The task exists by now; failing the whole add would make the user create it twice.
				return {task: created, createdLabels, labelError}
			}
		},
		onSuccess: (result, _input, client) => {
			addCreatedLabels(client, result.createdLabels)
			if (result.labelError !== undefined) {
				error(result.labelError)
			}
		},
		onSettled: (_input, client) => Promise.all([
			invalidateTaskCollections(client, 'all'),
			client.invalidateQueries({queryKey: labelKeys.all, refetchType: 'none'}),
		]),
	})
}

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

async function createQuickAddTasks(built: {task: QuickAddTask, labels: string[]}[]): Promise<{tasks: (Task | null)[], error: unknown | null}> {
	const groups = new Map<number, number[]>()
	built.forEach(({task}, index) => {
		const projectId = task.project_id ?? 0
		groups.set(projectId, [...(groups.get(projectId) ?? []), index])
	})

	const tasks: (Task | null)[] = built.map(() => null)
	let failure: unknown | null = null
	// Sequential throughout: the server assigns task indexes at insert time, and concurrent bulk writes fail under write contention (SQLite).
	for (const [projectId, indexes] of groups) {
		// Last chunk first: each batch lands on top of every view, so posting in reverse leaves the earliest lines topmost.
		for (const batch of chunk(indexes, MAX_TASKS_PER_BULK_CREATION).reverse()) {
			try {
				const {data} = await tasksBulkCreate({
					path: {project: projectId},
					body: {tasks: batch.map(index => built[index]!.task)},
				})
				if (!Array.isArray(data.tasks) || data.tasks.length !== batch.length) {
					throw new Error(translate('task.bulkCreateUnexpectedResponse'))
				}
				// The response is in payload order; titles can't be matched, quick add rewrites them.
				data.tasks.forEach((task, batchIndex) => {
					tasks[batch[batchIndex]!] = task
				})
			} catch (cause) {
				// Keep what other batches created so the caller can retry only the missing tasks.
				failure ??= cause
				break
			}
		}
	}
	return {tasks, error: failure}
}

export function quickAddTasksMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (input: QuickAddTasksInput): Promise<QuickAddTasksResult> => {
			const built = await Promise.all(input.entries.map(entry => buildQuickAddTask(entry.title, entry.projectId, input)))
			const {tasks, error: failure} = await createQuickAddTasks(built)

			// Resolved once for all created tasks, so a new label used on several lines is created only once.
			const titles = tasks.flatMap((task, index) => task ? built[index]!.labels : [])
			const {labels, created: createdLabels} = await ensureQuickAddLabels(titles)
			try {
				for (const [index, task] of tasks.entries()) {
					if (task) {
						tasks[index] = await attachLabels(task, partitionQuickAddLabels(labels, built[index]!.labels).found, input.labels)
					}
				}
			} catch (labelError) {
				return {tasks, createdLabels, error: failure, labelError}
			}
			return {tasks, createdLabels, error: failure}
		},
		onSuccess: (result, _input, client) => {
			addCreatedLabels(client, result.createdLabels)
			if (result.error !== null) {
				error(result.error)
			}
			if (result.labelError !== undefined) {
				error(result.labelError)
			}
		},
		onSettled: (_input, client) => Promise.all([
			invalidateTaskCollections(client, 'all'),
			client.invalidateQueries({queryKey: labelKeys.all, refetchType: 'none'}),
		]),
	})
}

// --- Hooks -----------------------------------------------------------------

export function useCreateTaskMutation(successMessage?: TaskMessage<CreateTaskInput>) {
	return useMutation(createTaskMutationOptions(successMessage))
}

export function usePatchTaskMutation(successMessage?: TaskMessage<PatchTaskInput>) {
	return useMutation(patchTaskMutationOptions(successMessage))
}

export function useUpdateTaskMutation() {
	return useMutation(updateTaskMutationOptions())
}

export function useDeleteTaskMutation() {
	return useMutation(deleteTaskMutationOptions())
}

export function useDuplicateTaskMutation() {
	return useMutation(duplicateTaskMutationOptions())
}

export function useMarkTaskReadMutation() {
	return useMutation(markTaskReadMutationOptions())
}

export function useUpdateTaskPositionMutation() {
	return useMutation(updateTaskPositionMutationOptions())
}

export function useBulkUpdateTasksMutation() {
	return useMutation(bulkUpdateTasksMutationOptions())
}

export function useToggleTaskFavoriteMutation() {
	return useMutation(toggleTaskFavoriteMutationOptions())
}

export function useMoveTaskToProjectMutation() {
	return useMutation(moveTaskToProjectMutationOptions())
}

export function useQuickAddTaskMutation() {
	return useMutation(quickAddTaskMutationOptions())
}

export function useQuickAddTasksMutation() {
	return useMutation(quickAddTasksMutationOptions())
}
