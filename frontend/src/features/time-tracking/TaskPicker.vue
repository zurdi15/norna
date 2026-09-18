<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {keepPreviousData, useQuery} from '@tanstack/vue-query'
import {refDebounced} from '@vueuse/core'

import type {Task} from '@/client/generated'
import {taskListQuery} from '@/client/queries/tasks'
import {useProjects} from '@/composables/useProjects'
import {getTaskIdentifier} from '@/modules/task/task'
import UiListbox from '@/ui/UiListbox.vue'

export type TaskWithId = Task & {id: number}

/** Finds the task to track time on: the recently tracked ones first, then the open tasks or the search results. */
const props = withDefaults(defineProps<{
	recent?: readonly Task[]
	selectedId?: number
}>(), {
	recent: () => [],
	selectedId: undefined,
})

const emit = defineEmits<{
	select: [task: TaskWithId]
}>()

const {t} = useI18n()
const projects = useProjects()

const query = ref('')
const search = refDebounced(query, 200)

const results = useQuery(computed(() => ({
	...taskListQuery({kind: 'all'}, {q: search.value, per_page: 20, sort_by: ['done', 'id'], order_by: ['asc', 'desc']}),
	placeholderData: keepPreviousData,
})))

const hasId = (task: Task): task is TaskWithId => task.id !== undefined

const items = computed(() => {
	const found = (results.data.value?.items ?? []).filter(hasId)
	if (search.value.trim() !== '') {
		return found
	}
	const recent = props.recent.filter(hasId)
	return [...recent, ...found.filter(task => !recent.some(other => other.id === task.id))]
})

function pick(id: number) {
	const task = items.value.find(candidate => candidate.id === id)
	if (task) {
		emit('select', task)
	}
}
</script>

<template>
	<UiListbox
		v-model:query="query"
		:model-value="selectedId"
		:items="items"
		:item-key="task => task.id"
		:item-label="task => task.title ?? ''"
		:label="t('timeTracking.form.task')"
		:search-placeholder="t('timeTracking.form.taskSearch')"
		:loading="results.isFetching.value"
		filter="none"
		class="md:w-80"
		@select="pick"
	>
		<template #item="{item}">
			<span class="w-12 shrink-0 truncate font-mono text-2xs text-ink-faint">{{ getTaskIdentifier(item) }}</span>
			<span
				class="min-w-0 flex-1 truncate"
				:class="item.done && 'text-ink-faint line-through'"
			>{{ item.title }}</span>
			<span
				v-if="item.project_id && projects.projects[item.project_id]"
				class="max-w-28 shrink-0 truncate text-xs text-ink-faint"
			>{{ projects.projects[item.project_id]?.title }}</span>
		</template>
	</UiListbox>
</template>
