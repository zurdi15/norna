import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {QueryObserver} from '@tanstack/vue-query'
import type {InfiniteData, MutationOptions} from '@tanstack/vue-query'

import type {Label, Task} from '@/client/generated'
import {queryClient} from '@/client/queryClient'
import {PrefixMode} from '@/modules/quickAddMagic/prefixes'
import {NO_DATE} from '@/modules/task/task'

const sdk = vi.hoisted(() => ({
	labelsCreate: vi.fn(),
	labelsList: vi.fn(),
	patchTasksRead: vi.fn(),
	projectTasksList: vi.fn(),
	projectViewTasksList: vi.fn(),
	projectsUsersSearch: vi.fn(),
	taskLabelsBulkReplace: vi.fn(),
	tasksBulkCreate: vi.fn(),
	tasksBulkUpdate: vi.fn(),
	tasksCreate: vi.fn(),
	tasksDelete: vi.fn(),
	tasksDuplicate: vi.fn(),
	tasksList: vi.fn(),
	tasksMarkRead: vi.fn(),
	tasksRead: vi.fn(),
	tasksUpdate: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))

vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)

import {labelKeys} from './labels'
import {projectKeys, type ProjectListResult} from './projects'
import {
	bulkUpdateTasksMutationOptions,
	createTaskMutationOptions,
	deleteTaskMutationOptions,
	duplicateTaskMutationOptions,
	editTasksInShape,
	everyTaskQuery,
	infiniteTaskListQuery,
	markTaskReadMutationOptions,
	moveTaskToProjectMutationOptions,
	nextTaskPage,
	patchTaskInCaches,
	patchTaskMutationOptions,
	ProjectRequiredError,
	quickAddTaskMutationOptions,
	quickAddTasksMutationOptions,
	removeTaskFromCaches,
	taskKeys,
	taskListQuery,
	taskPatchOperations,
	taskQuery,
	toggleTaskFavoriteMutationOptions,
	updateTaskMutationOptions,
	type TaskListScope,
	type TaskPage,
} from './tasks'

function run<TData, TVars, TContext>(options: MutationOptions<TData, Error, TVars, TContext>, vars: TVars): Promise<TData> {
	return queryClient.getMutationCache().build(queryClient, options).execute(vars)
}

function task(overrides: Partial<Task> = {}): Task {
	return {id: 1, title: 'Task', done: false, project_id: 1, ...overrides}
}

function taskPage(items: Task[], overrides: Partial<TaskPage> = {}): TaskPage {
	return {items, page: 1, per_page: 50, total: items.length, total_pages: 1, ...overrides}
}

const viewScope: TaskListScope = {kind: 'view', projectId: 1, viewId: 5}
const listKey = taskKeys.list(viewScope, {})
const infiniteKey = taskKeys.infiniteList(viewScope, {per_page: 50})
const boardKey = taskKeys.board(1, 6, {})

function seedCaches() {
	queryClient.setQueryData(taskKeys.detail(1), {...task(), max_permission: 2, comment_count: 3})
	queryClient.setQueryData(listKey, taskPage([task({position: 7}), task({id: 2, title: 'Other'})]))
	queryClient.setQueryData<InfiniteData<TaskPage, number>>(infiniteKey, {pages: [taskPage([task(), task({id: 3})])], pageParams: [1]})
	queryClient.setQueryData(boardKey, [
		{id: 10, project_view_id: 6, count: 1, tasks: [task({bucket_id: 10, position: 3})]},
		{id: 11, project_view_id: 6, count: 1, tasks: [task({id: 4, bucket_id: 11})]},
	])
}

function cachedDetail() {
	return queryClient.getQueryData<Task>(taskKeys.detail(1))
}

function cachedListTask(id = 1) {
	return queryClient.getQueryData<TaskPage>(listKey)?.items.find(item => item.id === id)
}

function cachedBoardTask(id = 1) {
	return queryClient.getQueryData<{tasks: Task[]}[]>(boardKey)?.flatMap(bucket => bucket.tasks).find(item => item.id === id)
}

beforeEach(() => {
	queryClient.clear()
	Object.values(sdk).forEach(mock => mock.mockReset())
	Object.values(message).forEach(mock => mock.mockReset())
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('task queries', () => {
	it('loads a task with the fields the detail view shows', async () => {
		sdk.tasksRead.mockResolvedValue({data: task()})

		await queryClient.fetchQuery(taskQuery(1))

		expect(sdk.tasksRead).toHaveBeenCalledExactlyOnceWith({
			path: {task: 1},
			query: {expand: ['reactions', 'comment_count', 'is_unread', 'buckets', 'time_entries_count']},
		})
	})

	it('does not retry a task the user cannot see', () => {
		const retry = taskQuery(1).retry as (count: number, error: unknown) => boolean

		expect(retry(0, {status: 404, code: 4002})).toBe(false)
		expect(retry(0, {status: 403})).toBe(false)
		expect(retry(0, {status: 500})).toBe(true)
		expect(retry(1, {status: 500})).toBe(false)
	})

	it.each([
		[{kind: 'all'}, 'tasksList', {query: {q: 'milk'}}],
		[{kind: 'project', projectId: -1}, 'projectTasksList', {path: {project: -1}, query: {q: 'milk'}}],
		[{kind: 'view', projectId: 1, viewId: 5}, 'projectViewTasksList', {path: {project: 1, view: 5}, query: {q: 'milk'}}],
	] as const)('lists %o through %s', async (scope, operation, request) => {
		sdk[operation].mockResolvedValue({data: {items: [task()], page: 1, total: 1, total_pages: 1}})

		const result = await queryClient.fetchQuery(taskListQuery(scope, {q: 'milk', filter: '', sort_by: []}))

		expect(sdk[operation]).toHaveBeenCalledExactlyOnceWith(request)
		expect(result.items).toEqual([task()])
	})

	it('keys a list without its empty params', () => {
		expect(taskListQuery(viewScope, {q: '', filter: '', sort_by: []}).queryKey).toEqual(taskListQuery(viewScope, {}).queryKey)
	})

	it('pages an infinite list until the last page', async () => {
		const query = infiniteTaskListQuery(viewScope, {q: 'milk'})
		sdk.projectViewTasksList.mockResolvedValue({data: {items: [task()], page: 1, total: 60, total_pages: 2}})

		await queryClient.fetchInfiniteQuery(query)

		expect(sdk.projectViewTasksList).toHaveBeenCalledWith({path: {project: 1, view: 5}, query: {q: 'milk', per_page: 50, page: 1}})
		expect(nextTaskPage(taskPage([], {page: 1, total_pages: 2}))).toBe(2)
		expect(nextTaskPage(taskPage([], {page: 2, total_pages: 2}))).toBeUndefined()
	})

	it('loads every page of an agenda query into one list', async () => {
		sdk.tasksList
			.mockResolvedValueOnce({data: {items: [task({id: 1})], page: 1, total: 2, total_pages: 2}})
			.mockResolvedValueOnce({data: {items: [task({id: 2})], page: 2, total: 2, total_pages: 2}})

		const tasks = await queryClient.fetchQuery(everyTaskQuery({filter: 'done = false', q: ''}))

		expect(tasks.map(item => item.id)).toEqual([1, 2])
		expect(sdk.tasksList).toHaveBeenNthCalledWith(2, {query: {filter: 'done = false', page: 2}})
		expect(everyTaskQuery({filter: 'done = false'}).queryKey[1]).toBe('list')
	})
})

describe('task cache edits', () => {
	beforeEach(seedCaches)

	it('patches the task in every cached shape', () => {
		patchTaskInCaches(queryClient, 1, {title: 'Renamed'})

		expect(cachedDetail()?.title).toBe('Renamed')
		expect(cachedListTask()?.title).toBe('Renamed')
		expect(queryClient.getQueryData<InfiniteData<TaskPage>>(infiniteKey)?.pages[0]?.items[0]?.title).toBe('Renamed')
		expect(cachedBoardTask()?.title).toBe('Renamed')
		expect(cachedListTask(2)?.title).toBe('Other')
	})

	it('patches the copies embedded as related tasks', () => {
		queryClient.setQueryData(taskKeys.detail(9), task({id: 9, related_tasks: {subtask: [task({title: 'child'})]}}))

		patchTaskInCaches(queryClient, 1, {done: true})

		expect(queryClient.getQueryData<Task>(taskKeys.detail(9))?.related_tasks?.subtask?.[0]?.done).toBe(true)
	})

	it('leaves queries without the task untouched, stale ones included', async () => {
		const before = queryClient.getQueryData(listKey)
		await queryClient.invalidateQueries({queryKey: listKey, refetchType: 'none'})

		patchTaskInCaches(queryClient, 99, {title: 'Elsewhere'})

		expect(queryClient.getQueryData(listKey)).toBe(before)
		expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
	})

	it('returns the same value when an edit changes nothing', () => {
		const data = taskPage([task()])

		expect(editTasksInShape(data, current => current)).toBe(data)
		expect(editTasksInShape(undefined, () => null)).toBeUndefined()
	})

	it('drops a removed task from lists and buckets and fixes their counts', () => {
		removeTaskFromCaches(queryClient, 1)

		const list = queryClient.getQueryData<TaskPage>(listKey)
		expect(list?.items.map(item => item.id)).toEqual([2])
		expect(list?.total).toBe(1)
		expect(queryClient.getQueryData<InfiniteData<TaskPage>>(infiniteKey)?.pages[0]?.items.map(item => item.id)).toEqual([3])
		const board = queryClient.getQueryData<{count: number, tasks: Task[]}[]>(boardKey)
		expect(board?.[0]).toMatchObject({count: 0, tasks: []})
		expect(board?.[1]?.count).toBe(1)
		expect(cachedDetail()).toBeDefined()
	})
})

describe('taskPatchOperations', () => {
	it('replaces each given field with its api value', () => {
		expect(taskPatchOperations({title: ' Milk ', hex_color: '#ff0000', due_date: null, done: undefined})).toEqual([
			{op: 'replace', path: '/title', value: 'Milk'},
			{op: 'replace', path: '/hex_color', value: 'ff0000'},
			{op: 'replace', path: '/due_date', value: NO_DATE},
		])
	})
})

describe('patch task mutation', () => {
	beforeEach(seedCaches)

	it('sends a JSON patch and shows the change before the request returns', async () => {
		sdk.patchTasksRead.mockImplementation(async () => {
			expect(cachedDetail()?.done).toBe(true)
			expect(cachedListTask()?.done).toBe(true)
			return {data: task({done: true, done_at: '2026-09-18T10:00:00Z'}), response: {status: 200}}
		})

		await run(patchTaskMutationOptions(), {id: 1, patch: {done: true}})

		expect(sdk.patchTasksRead).toHaveBeenCalledExactlyOnceWith({
			path: {task: 1},
			body: [{op: 'replace', path: '/done', value: true}],
			throwOnError: false,
		})
		expect(cachedDetail()?.done_at).toBe('2026-09-18T10:00:00Z')
		expect(message.success).toHaveBeenCalledWith({message: 'The task was successfully marked as done.'})
	})

	it('keeps view positions and expanded fields the write response lacks', async () => {
		sdk.patchTasksRead.mockResolvedValue({data: task({title: 'Renamed', position: 0, bucket_id: 0}), response: {status: 200}})

		await run(patchTaskMutationOptions(), {id: 1, patch: {title: 'Renamed'}})

		expect(cachedListTask()).toMatchObject({title: 'Renamed', position: 7})
		expect(cachedBoardTask()).toMatchObject({title: 'Renamed', position: 3, bucket_id: 10})
		expect(cachedDetail()).toMatchObject({title: 'Renamed', max_permission: 2, comment_count: 3})
	})

	it('takes the server result of a repeating task over the optimistic done', async () => {
		sdk.patchTasksRead.mockResolvedValue({
			data: task({done: false, due_date: '2026-09-25T10:00:00Z'}),
			response: {status: 200},
		})

		await run(patchTaskMutationOptions(), {id: 1, patch: {done: true}})

		expect(cachedDetail()).toMatchObject({done: false, due_date: '2026-09-25T10:00:00Z'})
	})

	it('treats the 304 of a patch that changes nothing as success', async () => {
		sdk.patchTasksRead.mockResolvedValue({data: undefined, error: {}, response: {status: 304}})

		await expect(run(patchTaskMutationOptions(), {id: 1, patch: {title: 'Task'}})).resolves.toBeUndefined()

		expect(message.error).not.toHaveBeenCalled()
	})

	it('rolls every cache back when the patch fails', async () => {
		const problem = {status: 403, code: 4003}
		sdk.patchTasksRead.mockResolvedValue({data: undefined, error: problem, response: {status: 403}})

		await expect(run(patchTaskMutationOptions(), {id: 1, patch: {title: 'Nope'}})).rejects.toBe(problem)

		expect(cachedDetail()?.title).toBe('Task')
		expect(cachedListTask()?.title).toBe('Task')
		expect(cachedBoardTask()?.title).toBe('Task')
		expect(message.error).toHaveBeenCalledWith(problem)
	})

	it('refetches active lists when a field decides list membership', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.patchTasksRead.mockResolvedValue({data: task({done: true}), response: {status: 200}})

		await run(patchTaskMutationOptions(), {id: 1, patch: {done: true}})

		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.boards(), refetchType: 'active'})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.detail(1)})
	})

	it('only marks lists stale for a field lists already show patched', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.patchTasksRead.mockResolvedValue({data: task({title: 'Renamed'}), response: {status: 200}})

		await run(patchTaskMutationOptions(), {id: 1, patch: {title: 'Renamed'}})

		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'none'})
		expect(invalidate).not.toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
	})

	it('restarts a list whose first load the optimistic update cancelled', async () => {
		const scope: TaskListScope = {kind: 'all'}
		sdk.tasksList
			.mockImplementationOnce(() => new Promise(() => {}))
			.mockResolvedValueOnce({data: {items: [task()], page: 1, total: 1, total_pages: 1}})
		// Vue Query's option types wrap refs, which the core observer does not take.
		const observer = new QueryObserver<TaskPage>(queryClient, taskListQuery(scope) as never)
		const unsubscribe = observer.subscribe(() => {})
		sdk.patchTasksRead.mockResolvedValue({data: task({title: 'Renamed'}), response: {status: 200}})

		await run(patchTaskMutationOptions(), {id: 1, patch: {title: 'Renamed'}})
		await vi.waitFor(() => expect(observer.getCurrentResult().data?.items).toHaveLength(1))

		expect(sdk.tasksList).toHaveBeenCalledTimes(2)
		unsubscribe()
	})

	it('toggles a favorite and refreshes the project list for the Favorites pseudo project', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.patchTasksRead.mockResolvedValue({data: task({is_favorite: true}), response: {status: 200}})

		await run(toggleTaskFavoriteMutationOptions(), {id: 1, isFavorite: true})

		expect(sdk.patchTasksRead.mock.calls[0]?.[0].body).toEqual([{op: 'replace', path: '/is_favorite', value: true}])
		expect(cachedListTask()?.is_favorite).toBe(true)
		expect(invalidate).toHaveBeenCalledWith({queryKey: projectKeys.list()})
		expect(message.success).not.toHaveBeenCalled()
	})

	it('moves a task to another project and names it in the toast', async () => {
		queryClient.setQueryData<ProjectListResult>(projectKeys.list(), {
			projects: [{id: 2, title: 'Work'} as ProjectListResult['projects'][number]],
			favoriteProject: null,
			savedFilterProjects: [],
		})
		sdk.patchTasksRead.mockResolvedValue({data: task({project_id: 2, identifier: 'WRK-1'}), response: {status: 200}})

		await run(moveTaskToProjectMutationOptions(), {id: 1, projectId: 2})

		expect(sdk.patchTasksRead.mock.calls[0]?.[0].body).toEqual([{op: 'replace', path: '/project_id', value: 2}])
		expect(cachedDetail()).toMatchObject({project_id: 2, identifier: 'WRK-1'})
		expect(message.success).toHaveBeenCalledWith({message: 'The task was moved to Work.'})
	})
})

describe('task writes', () => {
	beforeEach(seedCaches)

	it('replaces all fields with PUT for a full edit form', async () => {
		sdk.tasksUpdate.mockResolvedValue({data: task({title: 'Edited', description: '<p>x</p>'})})

		await run(updateTaskMutationOptions(), {
			id: 1,
			title: ' Edited ',
			description: '<p>x</p>',
			done: false,
			due_date: null,
			start_date: null,
			end_date: new Date('2026-10-01T00:00:00Z'),
			reminders: [],
			repeat_after: 0,
			repeat_mode: 0,
			priority: 0,
			hex_color: '#00ff00',
			percent_done: 0,
			project_id: 1,
			cover_image_attachment_id: 0,
			is_favorite: false,
		})

		expect(sdk.tasksUpdate.mock.calls[0]?.[0]).toMatchObject({
			path: {task: 1},
			body: {title: 'Edited', hex_color: '00ff00', due_date: NO_DATE, end_date: '2026-10-01T00:00:00.000Z'},
		})
		expect(cachedListTask()).toMatchObject({title: 'Edited', position: 7})
	})

	it('creates a task and refetches the lists it may appear in', async () => {
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		sdk.tasksCreate.mockResolvedValue({data: task({id: 8, title: 'New'})})

		await expect(run(createTaskMutationOptions(), {projectId: 1, task: {title: ' New ', bucket_id: 10}}))
			.resolves.toMatchObject({id: 8})

		expect(sdk.tasksCreate).toHaveBeenCalledWith({path: {project: 1}, body: {title: 'New', bucket_id: 10}})
		expect(invalidate).toHaveBeenCalledWith({queryKey: taskKeys.lists(), refetchType: 'active'})
		expect(message.success).not.toHaveBeenCalled()
	})

	it('removes a deleted task right away and forgets its detail', async () => {
		sdk.tasksDelete.mockImplementation(async () => {
			expect(cachedListTask()).toBeUndefined()
			expect(cachedBoardTask()).toBeUndefined()
			return {data: undefined}
		})

		await run(deleteTaskMutationOptions(), 1)

		expect(queryClient.getQueryData(taskKeys.detail(1))).toBeUndefined()
		expect(message.success).toHaveBeenCalledWith({message: 'The task has been deleted successfully.'})
	})

	it('restores a task whose delete failed', async () => {
		sdk.tasksDelete.mockRejectedValue({status: 500})

		await expect(run(deleteTaskMutationOptions(), 1)).rejects.toEqual({status: 500})

		expect(cachedListTask()).toBeDefined()
		expect(cachedBoardTask()).toBeDefined()
	})

	it('returns the duplicate', async () => {
		sdk.tasksDuplicate.mockResolvedValue({data: {duplicated_task: task({id: 12})}})

		await expect(run(duplicateTaskMutationOptions(), 1)).resolves.toMatchObject({id: 12})
	})

	it('rejects a duplicate response without the task', async () => {
		sdk.tasksDuplicate.mockResolvedValue({data: {}})

		await expect(run(duplicateTaskMutationOptions(), 1)).rejects.toThrow('missing the duplicated task')
	})

	it('clears the unread mark once the server confirms', async () => {
		queryClient.setQueryData(taskKeys.detail(1), task({is_unread: true}))
		sdk.tasksMarkRead.mockResolvedValue({data: {}})

		await run(markTaskReadMutationOptions(), 1)

		expect(sdk.tasksMarkRead).toHaveBeenCalledWith({path: {task: 1}})
		expect(cachedDetail()?.is_unread).toBe(false)
	})

	it('applies a bulk update to every selected task', async () => {
		sdk.tasksBulkUpdate.mockImplementation(async () => {
			expect(cachedListTask(1)?.priority).toBe(4)
			expect(cachedListTask(2)?.priority).toBe(4)
			return {data: {tasks: [task({priority: 4}), task({id: 2, title: 'Other', priority: 4})]}}
		})

		await run(bulkUpdateTasksMutationOptions(), {ids: [1, 2], patch: {priority: 4}})

		expect(sdk.tasksBulkUpdate).toHaveBeenCalledWith({body: {task_ids: [1, 2], fields: ['priority'], values: {priority: 4}}})
		expect(cachedBoardTask()?.priority).toBe(4)
	})
})

describe('quick add', () => {
	const projects: ProjectListResult = {
		projects: [
			{id: 1, title: 'Inbox', identifier: 'INB'},
			{id: 2, title: 'Work', identifier: 'WRK'},
		] as ProjectListResult['projects'],
		favoriteProject: null,
		savedFilterProjects: [],
	}
	const existingLabel: Label = {id: 1, title: 'urgent'}

	beforeEach(() => {
		queryClient.setQueryData(projectKeys.list(), projects)
		queryClient.setQueryData(labelKeys.all, [existingLabel])
		sdk.labelsList.mockResolvedValue({data: {items: [existingLabel], total_pages: 1}})
		sdk.tasksCreate.mockImplementation(async ({body}) => ({data: {...body, id: 50}}))
		sdk.taskLabelsBulkReplace.mockImplementation(async ({body}) => ({data: {labels: body.labels}}))
	})

	it('creates the task in the magic project with its labels, creating missing ones', async () => {
		sdk.labelsCreate.mockResolvedValue({data: {id: 7, title: 'errand'}})

		const result = await run(quickAddTaskMutationOptions(), {
			title: 'Buy milk *urgent *errand +work !3',
			projectId: 1,
			magicMode: PrefixMode.Default,
		})

		expect(sdk.tasksCreate).toHaveBeenCalledWith({path: {project: 2}, body: {title: 'Buy milk', project_id: 2, priority: 3}})
		expect(sdk.labelsCreate.mock.calls[0]?.[0].body.title).toBe('errand')
		expect(sdk.taskLabelsBulkReplace).toHaveBeenCalledWith({path: {task: 50}, body: {labels: [existingLabel, {id: 7, title: 'errand'}]}})
		expect(result.task.labels).toEqual([existingLabel, {id: 7, title: 'errand'}])
		expect(queryClient.getQueryData<Label[]>(labelKeys.all)).toEqual([existingLabel, {id: 7, title: 'errand'}])
	})

	it('falls back to the given project and skips labels that cannot be created', async () => {
		sdk.labelsCreate.mockRejectedValue({status: 403})

		const result = await run(quickAddTaskMutationOptions(), {title: 'Call mom *family', projectId: 1, magicMode: PrefixMode.Default})

		expect(sdk.tasksCreate).toHaveBeenCalledWith({path: {project: 1}, body: {title: 'Call mom', project_id: 1}})
		expect(sdk.taskLabelsBulkReplace).not.toHaveBeenCalled()
		expect(result.createdLabels).toEqual([])
	})

	it('assigns users the project search finds and leaves unknown ones in the title', async () => {
		sdk.projectsUsersSearch.mockImplementation(async ({query}) => ({
			data: {items: query.q === 'alice' ? [{id: 3, username: 'alice'}] : []},
		}))

		await run(quickAddTaskMutationOptions(), {title: 'Review @alice @nobody', projectId: 1, magicMode: PrefixMode.Default})

		expect(sdk.tasksCreate.mock.calls[0]?.[0].body).toMatchObject({title: 'Review @nobody', assignees: [{id: 3}]})
	})

	it('refuses to create a task without any project', async () => {
		await expect(run(quickAddTaskMutationOptions(), {title: 'Orphan', projectId: 0, magicMode: PrefixMode.Default}))
			.rejects.toBeInstanceOf(ProjectRequiredError)

		expect(sdk.tasksCreate).not.toHaveBeenCalled()
	})

	it('keeps the created task when attaching its labels fails', async () => {
		const failure = {status: 500}
		sdk.taskLabelsBulkReplace.mockRejectedValue(failure)

		const result = await run(quickAddTaskMutationOptions(), {title: 'Pay rent *urgent', projectId: 1, magicMode: PrefixMode.Default})

		expect(result).toMatchObject({task: {id: 50}, labelError: failure})
		expect(message.error).toHaveBeenCalledWith(failure)
	})

	describe('in bulk', () => {
		let nextId = 100

		beforeEach(() => {
			nextId = 100
			sdk.tasksBulkCreate.mockImplementation(async ({body}) => ({
				data: {tasks: body.tasks.map((created: Task) => ({...created, id: nextId++}))},
			}))
		})

		function titlesOf(call: number): string[] {
			return sdk.tasksBulkCreate.mock.calls[call]?.[0].body.tasks.map((created: Task) => created.title)
		}

		it('sends one request per project and keeps the results aligned with the input', async () => {
			const result = await run(quickAddTasksMutationOptions(), {
				entries: [
					{title: 'a', projectId: 1},
					{title: 'b +work', projectId: 1},
					{title: 'c', projectId: 1},
				],
				magicMode: PrefixMode.Default,
			})

			expect(sdk.tasksBulkCreate.mock.calls.map(call => call[0].path.project)).toEqual([1, 2])
			expect(titlesOf(0)).toEqual(['a', 'c'])
			expect(result.tasks.map(created => created?.title)).toEqual(['a', 'b', 'c'])
			expect(result.error).toBeNull()
		})

		it('chunks at 100 tasks and submits the last chunk first', async () => {
			const titles = Array.from({length: 205}, (_, index) => `task ${index}`)

			const result = await run(quickAddTasksMutationOptions(), {
				entries: titles.map(title => ({title, projectId: 1})),
				magicMode: PrefixMode.Disabled,
			})

			expect(sdk.tasksBulkCreate.mock.calls.map(call => call[0].body.tasks.length)).toEqual([5, 100, 100])
			expect(titlesOf(0)).toEqual(titles.slice(200))
			expect(titlesOf(2)).toEqual(titles.slice(0, 100))
			expect(result.tasks.map(created => created?.title)).toEqual(titles)
		})

		it('stops after a failed batch and keeps what was created before it', async () => {
			const failure = {status: 500}
			sdk.tasksBulkCreate
				.mockImplementationOnce(async ({body}) => ({data: {tasks: body.tasks.map((created: Task) => ({...created, id: nextId++}))}}))
				.mockRejectedValueOnce(failure)
			const titles = Array.from({length: 205}, (_, index) => `task ${index}`)

			const result = await run(quickAddTasksMutationOptions(), {
				entries: titles.map(title => ({title, projectId: 1})),
				magicMode: PrefixMode.Disabled,
			})

			expect(sdk.tasksBulkCreate).toHaveBeenCalledTimes(2)
			expect(result.error).toBe(failure)
			expect(result.tasks.slice(200).map(created => created?.title)).toEqual(titles.slice(200))
			expect(result.tasks.slice(0, 200).every(created => created === null)).toBe(true)
			expect(message.error).toHaveBeenCalledWith(failure)
		})

		it('fails a batch whose response does not match the payload', async () => {
			sdk.tasksBulkCreate.mockResolvedValue({data: {tasks: []}})

			const result = await run(quickAddTasksMutationOptions(), {
				entries: [{title: 'a', projectId: 1}, {title: 'b', projectId: 1}],
				magicMode: PrefixMode.Disabled,
			})

			expect(result.error).toBeInstanceOf(Error)
			expect(result.tasks).toEqual([null, null])
		})

		it('creates a new label used on several lines only once', async () => {
			sdk.labelsCreate.mockResolvedValue({data: {id: 9, title: 'errand'}})

			const result = await run(quickAddTasksMutationOptions(), {
				entries: [{title: 'a *errand', projectId: 1}, {title: 'b *errand', projectId: 1}],
				magicMode: PrefixMode.Default,
			})

			expect(sdk.labelsCreate).toHaveBeenCalledOnce()
			expect(sdk.taskLabelsBulkReplace).toHaveBeenCalledTimes(2)
			expect(result.tasks.map(created => created?.labels)).toEqual([[{id: 9, title: 'errand'}], [{id: 9, title: 'errand'}]])
		})
	})
})
