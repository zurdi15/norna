<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery, keepPreviousData} from '@tanstack/vue-query'
import {refDebounced} from '@vueuse/core'

import type {Task} from '@/client/generated'
import {taskListQuery, type TaskDetail} from '@/client/queries/tasks'
import {useCreateRelationMutation} from '@/client/queries/taskRelations'
import {getTaskIdentifier} from '@/modules/task/task'
import type {RelationKind} from '@/modules/task/relations'
import {useAuthStore} from '@/stores/auth'
import UiField from '@/ui/UiField.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiSelect from '@/ui/UiSelect.vue'

import {RELATION_KINDS} from './relationKinds'

type TaskWithId = Task & {id: number}

/** Links the open task to another one: pick how they relate, then find the other task. */
const props = defineProps<{
	task: TaskDetail
}>()

const emit = defineEmits<{
	done: []
}>()

const {t} = useI18n()
const createRelation = useCreateRelationMutation()

const authStore = useAuthStore()
const kind = ref<RelationKind>((authStore.settings.frontend_settings.default_task_relation_type as RelationKind | undefined) ?? 'related')
const query = ref('')
const search = refDebounced(query, 200)

const results = useQuery(computed(() => ({
	...taskListQuery({kind: 'all'}, {q: search.value, per_page: 20, sort_by: ['done', 'id'], order_by: ['asc', 'desc']}),
	placeholderData: keepPreviousData,
})))

const kindItems = computed(() => RELATION_KINDS.map(value => ({value, label: t(`taskDetail.relations.kinds.${value}`)})))

// Neither the task itself nor what it is already related to in this way.
const items = computed(() => (results.data.value?.items ?? []).filter((candidate): candidate is TaskWithId =>
	candidate.id !== undefined && candidate.id !== props.task.id
	&& !(props.task.related_tasks?.[kind.value] ?? []).some(related => related.id === candidate.id)))

async function relate(otherTaskId: number) {
	const otherTask = items.value.find(candidate => candidate.id === otherTaskId)
	if (!otherTask || props.task.id === undefined) {
		return
	}
	try {
		await createRelation.mutateAsync({task: props.task as TaskWithId, otherTask, relationKind: kind.value})
		emit('done')
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<div class="grid md:w-80">
		<UiField
			:label="t('taskDetail.relations.kind')"
			class="px-3 pt-3 pb-2"
		>
			<UiSelect
				v-model="kind"
				:items="kindItems"
				size="sm"
			/>
		</UiField>
		<UiListbox
			v-model:query="query"
			:items="items"
			:item-key="candidate => candidate.id"
			:item-label="candidate => candidate.title ?? ''"
			:label="t('taskDetail.relations.searchTask')"
			:search-placeholder="t('taskDetail.relations.searchTask')"
			:loading="results.isFetching.value"
			filter="none"
			@select="relate"
		>
			<template #item="{item}">
				<span class="w-12 shrink-0 truncate font-mono text-2xs text-ink-faint">{{ getTaskIdentifier(item) }}</span>
				<span
					class="min-w-0 flex-1 truncate"
					:class="item.done && 'text-ink-faint line-through'"
				>{{ item.title }}</span>
			</template>
		</UiListbox>
	</div>
</template>
