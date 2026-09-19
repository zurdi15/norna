import type {Component} from 'vue'
import {ChartGantt, List, SquareKanban, Table2} from '@lucide/vue'

import type {ProjectView} from '@/client/generated'

export type ViewKind = NonNullable<ProjectView['view_kind']>

export const VIEW_ICONS: Record<ViewKind, Component> = {
	list: List,
	kanban: SquareKanban,
	table: Table2,
	gantt: ChartGantt,
}

// The api names the views it creates in English; those titles follow the UI language instead.
const DEFAULT_TITLES: Record<ViewKind, string> = {
	list: 'List',
	kanban: 'Kanban',
	table: 'Table',
	gantt: 'Gantt',
}

export function viewTitle(view: ProjectView, t: (key: string) => string): string {
	const kind = view.view_kind
	return kind && view.title === DEFAULT_TITLES[kind] ? t(`projectView.kinds.${kind}`) : view.title ?? ''
}
