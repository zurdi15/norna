import type {ProjectView, Task} from '@/client/generated'
import {positionForIndex, type BoardBucket} from '@/client/queries/taskBoard'
import type {UiMenuEntry} from '@/ui/menu'

/** How the view makes its columns: manual buckets the user edits, or one per saved filter. */
export type BucketMode = 'manual' | 'filter'

export function bucketMode(view: Pick<ProjectView, 'bucket_configuration_mode'>): BucketMode {
	return view.bucket_configuration_mode === 'filter' ? 'filter' : 'manual'
}

type ViewBuckets = Pick<ProjectView, 'bucket_configuration_mode' | 'done_bucket_id' | 'default_bucket_id'>

// 0 means "none", and filter columns are numbered from 0, so both need the manual check.
function isViewBucket(view: ViewBuckets, id: number | undefined, bucketId: number): boolean {
	return bucketMode(view) === 'manual' && (id ?? 0) > 0 && id === bucketId
}

export function isDoneBucket(view: ViewBuckets, bucketId: number): boolean {
	return isViewBucket(view, view.done_bucket_id, bucketId)
}

export function isDefaultBucket(view: ViewBuckets, bucketId: number): boolean {
	return isViewBucket(view, view.default_bucket_id, bucketId)
}

type Limited = Pick<BoardBucket, 'limit' | 'count'>

export function isBucketFull(bucket: Limited): boolean {
	const limit = bucket.limit ?? 0
	return limit > 0 && bucket.count >= limit
}

/** "4", or "4/5" when the column has a limit. */
export function bucketCountLabel(bucket: Limited): string {
	const limit = bucket.limit ?? 0
	return limit > 0 ? `${bucket.count}/${limit}` : String(bucket.count)
}

/**
 * Whether a card from `fromBucketId` may land in `target`. Reordering inside its own
 * column always works, even in a full one; filter columns are defined by their filters,
 * so a card can't be moved between them; a full column takes no more cards.
 */
export function canDropInBucket(mode: BucketMode, target: Limited & Pick<BoardBucket, 'id'>, fromBucketId: number): boolean {
	if (target.id === fromBucketId) {
		return true
	}
	return mode === 'manual' && !isBucketFull(target)
}

/** A card moved through "Move to…" goes on top of its new column, where it is seen. */
export function topPosition(tasks: readonly Pick<Task, 'id' | 'position'>[], movingId?: number): number {
	return positionForIndex(tasks, 0, movingId)
}

/** A card added from the column's footer goes below the loaded ones. */
export function bottomPosition(items: readonly Pick<Task, 'id' | 'position'>[]): number {
	return positionForIndex(items, items.length)
}

/** The column whose start is closest to the scroll offset: the one a phone shows. */
export function nearestColumnIndex(scrollLeft: number, columnStarts: readonly number[]): number {
	let nearest = 0
	let distance = Number.POSITIVE_INFINITY
	columnStarts.forEach((start, index) => {
		const current = Math.abs(start - scrollLeft)
		if (current < distance) {
			distance = current
			nearest = index
		}
	})
	return nearest
}

/** A whole, non-negative number of cards, or null for anything else. Empty means no limit. */
export function parseLimit(input: string | number | null | undefined): number | null {
	const text = String(input ?? '').trim()
	if (text === '') {
		return 0
	}
	if (!/^\d+$/.test(text)) {
		return null
	}
	return Number(text)
}

/** Puts "Move to…" right after the first block of the task menu (open, complete). */
export function withMoveEntry(entries: UiMenuEntry[], moveEntry: UiMenuEntry): UiMenuEntry[] {
	const separator = entries.findIndex(entry => entry.type === 'separator')
	const at = separator === -1 ? entries.length : separator
	return [...entries.slice(0, at), moveEntry, ...entries.slice(at)]
}

/** The saved filter of a filter column, whose id is its index in the view's configuration. */
export function bucketFilterFor(view: Pick<ProjectView, 'bucket_configuration_mode' | 'bucket_configuration'>, bucketId: number) {
	return bucketMode(view) === 'filter' ? view.bucket_configuration?.[bucketId]?.filter : undefined
}
