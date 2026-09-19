import {describe, expect, it} from 'vitest'

import type {UiMenuEntry} from '@/ui/menu'

import {
	bottomPosition,
	bucketCountLabel,
	bucketFilterFor,
	bucketMode,
	canDropInBucket,
	isBucketFull,
	isDefaultBucket,
	isDoneBucket,
	nearestColumnIndex,
	parseLimit,
	topPosition,
	withMoveEntry,
} from './kanban'

const bucket = (id: number, count: number, limit = 0) => ({id, count, limit})

describe('bucketMode', () => {
	it('reads filter views as filter and everything else as manual', () => {
		expect(bucketMode({bucket_configuration_mode: 'filter'})).toBe('filter')
		expect(bucketMode({bucket_configuration_mode: 'manual'})).toBe('manual')
		expect(bucketMode({bucket_configuration_mode: 'none'})).toBe('manual')
		expect(bucketMode({})).toBe('manual')
	})
})

describe('isBucketFull', () => {
	it('is never full without a limit', () => {
		expect(isBucketFull(bucket(1, 99))).toBe(false)
	})

	it('is full at and over its limit', () => {
		expect(isBucketFull(bucket(1, 2, 3))).toBe(false)
		expect(isBucketFull(bucket(1, 3, 3))).toBe(true)
		expect(isBucketFull(bucket(1, 4, 3))).toBe(true)
	})
})

describe('bucketCountLabel', () => {
	it('shows the limit only when there is one', () => {
		expect(bucketCountLabel(bucket(1, 4))).toBe('4')
		expect(bucketCountLabel(bucket(1, 4, 5))).toBe('4/5')
	})
})

describe('canDropInBucket', () => {
	it('always lets a card be reordered in its own column, even a full one', () => {
		expect(canDropInBucket('manual', bucket(1, 3, 3), 1)).toBe(true)
		expect(canDropInBucket('filter', bucket(1, 3), 1)).toBe(true)
	})

	it('takes cards from other columns until the limit', () => {
		expect(canDropInBucket('manual', bucket(2, 0), 1)).toBe(true)
		expect(canDropInBucket('manual', bucket(2, 2, 3), 1)).toBe(true)
		expect(canDropInBucket('manual', bucket(2, 3, 3), 1)).toBe(false)
	})

	it('never moves cards between filter columns', () => {
		expect(canDropInBucket('filter', bucket(2, 0), 1)).toBe(false)
	})
})

describe('topPosition', () => {
	it('goes before the first card', () => {
		expect(topPosition([{id: 1, position: 100}, {id: 2, position: 200}])).toBe(50)
	})

	it('ignores the moving card when it already sits on top', () => {
		expect(topPosition([{id: 1, position: 100}, {id: 2, position: 200}], 1)).toBe(100)
	})

	it('starts an empty column at 0', () => {
		expect(topPosition([])).toBe(0)
	})
})

describe('bottomPosition', () => {
	it('goes after the last card', () => {
		expect(bottomPosition([{id: 1, position: 100}, {id: 2, position: 200}])).toBe(200 + 2 ** 16)
	})

	it('starts an empty column at 0', () => {
		expect(bottomPosition([])).toBe(0)
	})
})

describe('nearestColumnIndex', () => {
	const starts = [0, 330, 660, 990]

	it('picks the column whose start is closest', () => {
		expect(nearestColumnIndex(0, starts)).toBe(0)
		expect(nearestColumnIndex(150, starts)).toBe(0)
		expect(nearestColumnIndex(200, starts)).toBe(1)
		expect(nearestColumnIndex(700, starts)).toBe(2)
	})

	it('picks the last column when scrolled past every start', () => {
		expect(nearestColumnIndex(5000, starts)).toBe(3)
	})

	it('falls back to the first column without any', () => {
		expect(nearestColumnIndex(120, [])).toBe(0)
	})
})

describe('parseLimit', () => {
	it('reads whole numbers', () => {
		expect(parseLimit('5')).toBe(5)
		expect(parseLimit(' 12 ')).toBe(12)
		expect(parseLimit(3)).toBe(3)
	})

	it('reads empty as no limit', () => {
		expect(parseLimit('')).toBe(0)
		expect(parseLimit('  ')).toBe(0)
		expect(parseLimit(null)).toBe(0)
	})

	it('rejects anything that is not a whole, non-negative number', () => {
		expect(parseLimit('-1')).toBeNull()
		expect(parseLimit('2.5')).toBeNull()
		expect(parseLimit('five')).toBeNull()
	})
})

describe('withMoveEntry', () => {
	const move: UiMenuEntry = {label: 'Move to…', onSelect: () => {}}
	const open: UiMenuEntry = {label: 'Open', onSelect: () => {}}
	const complete: UiMenuEntry = {label: 'Complete', onSelect: () => {}}
	const remove: UiMenuEntry = {label: 'Delete', onSelect: () => {}}

	it('goes at the end of the first block', () => {
		const entries: UiMenuEntry[] = [open, complete, {type: 'separator'}, remove]
		expect(withMoveEntry(entries, move)).toEqual([open, complete, move, {type: 'separator'}, remove])
	})

	it('goes last when the menu has no separator', () => {
		expect(withMoveEntry([open], move)).toEqual([open, move])
	})
})

describe('isDoneBucket and isDefaultBucket', () => {
	it('match the view\'s buckets on manual boards', () => {
		const view = {bucket_configuration_mode: 'manual' as const, done_bucket_id: 6, default_bucket_id: 4}
		expect(isDoneBucket(view, 6)).toBe(true)
		expect(isDoneBucket(view, 4)).toBe(false)
		expect(isDefaultBucket(view, 4)).toBe(true)
	})

	it('read 0 as no bucket', () => {
		const view = {bucket_configuration_mode: 'manual' as const, done_bucket_id: 0, default_bucket_id: 0}
		expect(isDoneBucket(view, 0)).toBe(false)
		expect(isDefaultBucket(view, 0)).toBe(false)
	})

	it('never match filter columns, which are numbered from 0', () => {
		const view = {bucket_configuration_mode: 'filter' as const, done_bucket_id: 1, default_bucket_id: 0}
		expect(isDoneBucket(view, 1)).toBe(false)
		expect(isDefaultBucket(view, 0)).toBe(false)
	})
})

describe('bucketFilterFor', () => {
	const done = {filter: 'done = true'}
	const open = {filter: 'done = false'}

	it('finds a filter column by its index', () => {
		const view = {bucket_configuration_mode: 'filter' as const, bucket_configuration: [{title: 'Open', filter: open}, {title: 'Done', filter: done}]}
		expect(bucketFilterFor(view, 1)).toBe(done)
		expect(bucketFilterFor(view, 0)).toBe(open)
	})

	it('has none on manual boards', () => {
		const view = {bucket_configuration_mode: 'manual' as const, bucket_configuration: [{title: 'Open', filter: open}]}
		expect(bucketFilterFor(view, 0)).toBeUndefined()
	})
})
