import {describe, expect, it} from 'vitest'

import {addRelatedTask, inverseRelationKind, removeRelatedTask} from './relations'

describe('inverseRelationKind', () => {
	it.each([
		['subtask', 'parenttask'],
		['parenttask', 'subtask'],
		['related', 'related'],
		['duplicateof', 'duplicates'],
		['blocking', 'blocked'],
		['precedes', 'follows'],
		['copiedfrom', 'copiedto'],
	] as const)('maps %s to %s', (kind, inverse) => {
		expect(inverseRelationKind(kind)).toBe(inverse)
		expect(inverseRelationKind(inverse)).toBe(kind)
	})
})

describe('related task maps', () => {
	it('adds a task under its kind without duplicating it', () => {
		const once = addRelatedTask({related: [{id: 1}]}, 'subtask', {id: 2, title: 'child'})
		const twice = addRelatedTask(once, 'subtask', {id: 2, title: 'renamed'})

		expect(twice).toEqual({related: [{id: 1}], subtask: [{id: 2, title: 'renamed'}]})
	})

	it('drops a kind once its last task is removed', () => {
		const related = {subtask: [{id: 2}], related: [{id: 1}, {id: 3}]}

		expect(removeRelatedTask(related, 'subtask', 2)).toEqual({related: [{id: 1}, {id: 3}]})
		expect(removeRelatedTask(related, 'related', 1)).toEqual({subtask: [{id: 2}], related: [{id: 3}]})
		expect(related.subtask).toEqual([{id: 2}])
	})
})
