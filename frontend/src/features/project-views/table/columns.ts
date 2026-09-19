import type {SortBy} from '@/composables/useTaskList'

export type TableColumnKey =
	| 'done'
	| 'identifier'
	| 'title'
	| 'project'
	| 'priority'
	| 'labels'
	| 'assignees'
	| 'due_date'
	| 'start_date'
	| 'end_date'
	| 'percent_done'
	| 'done_at'
	| 'created'
	| 'updated'
	| 'created_by'
	| 'comments'

export interface TableColumn {
	key: TableColumnKey
	// The sort field behind the column header; none for columns the api can't sort by.
	sort?: keyof SortBy
	visibleByDefault: boolean
	// The title can't be hidden: it's the link to the task and the sticky column.
	required?: boolean
}

export const TABLE_COLUMNS: readonly TableColumn[] = [
	{key: 'done', sort: 'done', visibleByDefault: true},
	{key: 'identifier', sort: 'index', visibleByDefault: true},
	{key: 'title', sort: 'title', visibleByDefault: true, required: true},
	{key: 'project', visibleByDefault: false},
	{key: 'priority', sort: 'priority', visibleByDefault: true},
	{key: 'labels', visibleByDefault: true},
	{key: 'assignees', visibleByDefault: true},
	{key: 'due_date', sort: 'due_date', visibleByDefault: true},
	{key: 'start_date', sort: 'start_date', visibleByDefault: false},
	{key: 'end_date', sort: 'end_date', visibleByDefault: false},
	{key: 'percent_done', sort: 'percent_done', visibleByDefault: false},
	{key: 'done_at', sort: 'done_at', visibleByDefault: false},
	{key: 'created', sort: 'created', visibleByDefault: false},
	{key: 'updated', sort: 'updated', visibleByDefault: false},
	{key: 'created_by', visibleByDefault: false},
	{key: 'comments', visibleByDefault: false},
]

export function defaultVisibleColumns(): TableColumnKey[] {
	return TABLE_COLUMNS.filter(column => column.visibleByDefault).map(column => column.key)
}

/**
 * The next sort after clicking a column header: descending, then ascending, then
 * off. Without a modifier key it replaces the sort; with one it adds a column to it.
 */
export function nextSort(current: SortBy, field: keyof SortBy, additive: boolean): SortBy {
	const order = current[field]
	const next = order === undefined || order === 'none' ? 'desc' : order === 'desc' ? 'asc' : undefined
	const base: SortBy = additive ? {...current} : {}
	delete base[field]
	return next ? {...base, [field]: next} : base
}
