import {inject, provide, ref, shallowRef, type ComputedRef, type InjectionKey, type Ref} from 'vue'

import type {ProjectView, Task} from '@/client/generated'
import type {BoardBucket} from '@/client/queries/taskBoard'
import type {TaskBoardParams} from '@/client/queries/tasks'

import type {BucketMode} from './kanban'

export interface CardDrag {
	taskId: number
	fromBucketId: number
	// Set once the drop asked the server to move the card.
	moved: boolean
}

export interface CardMove {
	taskId: number
	fromBucketId: number
	bucketId: number
	position: number
}

/** What every column and card of one board shares. Provided by ProjectKanbanView. */
export interface KanbanBoard {
	projectId: ComputedRef<number>
	viewId: ComputedRef<number>
	view: ComputedRef<ProjectView>
	mode: ComputedRef<BucketMode>
	params: ComputedRef<TaskBoardParams>
	buckets: ComputedRef<BoardBucket[]>
	canWrite: ComputedRef<boolean>
	// Rename, limit, reorder, create and delete columns: manual boards only.
	canEditBuckets: ComputedRef<boolean>
	// Cards can change column by drag (wide screens) or "Move to…".
	canMoveBetween: ComputedRef<boolean>
	dragging: Ref<CardDrag | null>
	// Bumped when the columns must drop their local order and show the server's again.
	syncToken: Ref<number>
	startDrag: (taskId: number, fromBucketId: number) => void
	endDrag: () => void
	moveTask: (move: CardMove) => void
	openMoveTo: (task: Task, bucketId: number) => void
	isCollapsed: (bucketId: number) => boolean
	setCollapsed: (bucketId: number, collapsed: boolean) => void
	// A drag ends with a click that must not open the task it dropped.
	isClickSuppressed: () => boolean
}

const KANBAN_BOARD: InjectionKey<KanbanBoard> = Symbol('KanbanBoard')

export function provideKanbanBoard(board: KanbanBoard) {
	provide(KANBAN_BOARD, board)
}

export function useKanbanBoard(): KanbanBoard {
	const board = inject(KANBAN_BOARD)
	if (!board) {
		throw new Error('useKanbanBoard() needs a board provided by ProjectKanbanView')
	}
	return board
}

/** The drag bookkeeping of a board, split out so the view only wires it up. */
export function useCardDrag() {
	const dragging = ref<CardDrag | null>(null)
	const syncToken = ref(0)
	const suppressedUntil = shallowRef(0)

	function startDrag(taskId: number, fromBucketId: number) {
		dragging.value = {taskId, fromBucketId, moved: false}
	}

	function endDrag() {
		const moved = dragging.value?.moved ?? false
		dragging.value = null
		suppressClick()
		// Without a move no cache update follows, so the columns resync now.
		if (!moved) {
			syncToken.value++
		}
	}

	function markMoved() {
		if (dragging.value) {
			dragging.value = {...dragging.value, moved: true}
		}
	}

	function suppressClick() {
		suppressedUntil.value = performance.now() + 400
	}

	function isClickSuppressed() {
		return performance.now() < suppressedUntil.value
	}

	return {dragging, syncToken, startDrag, endDrag, markMoved, suppressClick, isClickSuppressed}
}
