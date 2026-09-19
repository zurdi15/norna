import {computed, inject, type InjectionKey, type Ref} from 'vue'

import type {Label, User} from '@/client/generated'
import {getLabelByExactTitle, getLabelById} from '@/client/queries/labels'
import {findProjectByExactTitle, type ProjectResponse} from '@/client/queries/projects'
import {searchProjectUsers, searchUsers} from '@/client/queries/userSearch'
import {useLabels} from '@/composables/useLabels'
import {useProjects} from '@/composables/useProjects'
import {transformFilterStringForApi, transformFilterStringFromApi} from '@/helpers/filters'

/**
 * What the filter editor suggests and resolves names against. The app reads the cached
 * labels, projects and the user search; the dev catalog provides sample data instead.
 */
export interface FilterData {
	labels: Readonly<Ref<Label[]>>
	// Real projects only, archived ones included so old filters still resolve.
	projects: Readonly<Ref<ProjectResponse[]>>
	searchUsers: (query: string, projectId?: number) => Promise<User[]>
}

export const filterDataKey: InjectionKey<FilterData> = Symbol('FilterData')

function useLiveFilterData(): FilterData {
	const {labels} = useLabels()
	const projectList = useProjects()
	return {
		labels,
		// Saved filters and the favorites pseudo project have negative ids.
		projects: computed(() => projectList.projectsArray.filter(project => project.id > 0)),
		searchUsers: (query, projectId) => projectId ? searchProjectUsers(projectId, query) : searchUsers(query),
	}
}

export function useFilterData(): FilterData {
	return inject(filterDataKey, null) ?? useLiveFilterData()
}

/**
 * Converts between the api's filter (labels and projects by id, snake_case fields) and the
 * one people read and type (names, camelCase fields). Unknown names and ids pass through.
 */
export function useFilterConversion(data: FilterData = useFilterData()) {
	function toApi(display: string): string {
		return transformFilterStringForApi(
			display,
			title => getLabelByExactTitle(data.labels.value, title)?.id ?? null,
			title => findProjectByExactTitle(data.projects.value, title)?.id ?? null,
		)
	}

	function fromApi(filter: string): string {
		return transformFilterStringFromApi(
			filter,
			id => getLabelById(data.labels.value, id)?.title,
			id => data.projects.value.find(project => project.id === id)?.title,
		)
	}

	return {toApi, fromApi}
}
