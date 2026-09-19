import type {Prefixes} from './types'

const NORNA_PREFIXES: Prefixes = {
	label: '*',
	project: '+',
	priority: '!',
	assignee: '@',
}

const TODOIST_PREFIXES: Prefixes = {
	label: '@',
	project: '#',
	priority: '!',
	assignee: '+',
}

export enum PrefixMode {
	Disabled = 'disabled',
	Default = 'norna',
	Todoist = 'todoist',
}

export const PREFIXES = {
	[PrefixMode.Disabled]: undefined,
	[PrefixMode.Default]: NORNA_PREFIXES,
	[PrefixMode.Todoist]: TODOIST_PREFIXES,
}
