<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {Link2, Plus} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {useQuickAddTaskMutation, type TaskDetail} from '@/client/queries/tasks'
import {useCreateRelationMutation, useDeleteRelationMutation} from '@/client/queries/taskRelations'
import type {RelationKind} from '@/modules/task/relations'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiProgress from '@/ui/UiProgress.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import {useQuickAddSettings} from '../useQuickAddSettings'
import DetailSection from './DetailSection.vue'
import RelatedTaskRow from './RelatedTaskRow.vue'
import RelationPicker from './RelationPicker.vue'
import {RELATION_KINDS} from './relationKinds'

type TaskWithId = Task & {id: number}

/** Subtasks, with a line to add the next one, and every other relation grouped by kind. */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const quickAddSettings = useQuickAddSettings()
const quickAdd = useQuickAddTaskMutation()
const createRelation = useCreateRelationMutation()
const deleteRelation = useDeleteRelationMutation()

const subtasks = computed(() => props.task.related_tasks?.subtask ?? [])
const subtasksDone = computed(() => subtasks.value.filter(task => task.done).length)
const others = computed(() => RELATION_KINDS
	.filter(kind => kind !== 'subtask')
	.map(kind => ({kind, tasks: props.task.related_tasks?.[kind] ?? []}))
	.filter(group => group.tasks.length > 0))

const newSubtask = ref('')
const adding = ref(false)
const subtaskInput = useTemplateRef<HTMLInputElement>('subtaskInput')
const pickerOpen = ref(false)

// The title goes through quick add magic, so "Buy tickets *travel tomorrow" works here too.
async function addSubtask() {
	const title = newSubtask.value.trim()
	if (title === '' || props.task.id === undefined || adding.value) {
		return
	}
	adding.value = true
	try {
		const {task: created} = await quickAdd.mutateAsync({
			...quickAddSettings.value,
			title,
			projectId: props.task.project_id ?? 0,
		})
		newSubtask.value = ''
		await createRelation.mutateAsync({
			task: props.task as TaskWithId,
			otherTask: created as TaskWithId,
			relationKind: 'subtask',
		})
	} catch {
		// Reported by the mutations; the title stays in the field to try again.
	} finally {
		adding.value = false
		subtaskInput.value?.focus()
	}
}

defineExpose({
	link: () => pickerOpen.value = true,
})

function unrelate(kind: RelationKind, other: Task) {
	if (props.task.id !== undefined && other.id !== undefined) {
		deleteRelation.mutate({taskId: props.task.id, otherTaskId: other.id, relationKind: kind})
	}
}
</script>

<template>
	<DetailSection
		v-if="editable || subtasks.length"
		:title="t('taskDetail.relations.subtasks')"
		:count="subtasks.length ? `${subtasksDone}/${subtasks.length}` : undefined"
	>
		<template
			v-if="editable"
			#actions
		>
			<UiAdaptivePopover
				v-model:open="pickerOpen"
				:title="t('taskDetail.relations.link')"
				align="end"
			>
				<template #trigger>
					<UiButton
						variant="ghost"
						size="sm"
						:icon="Link2"
						class="-me-2 text-ink-faint"
					>
						{{ t('taskDetail.relations.link') }}
					</UiButton>
				</template>
				<RelationPicker
					:task="task"
					@done="pickerOpen = false"
				/>
			</UiAdaptivePopover>
		</template>
		<UiProgress
			v-if="subtasks.length"
			:value="subtasksDone"
			:max="subtasks.length"
			class="mb-1.5"
		/>
		<RelatedTaskRow
			v-for="subtask in subtasks"
			:key="subtask.id"
			:task="subtask"
			:project-id="task.project_id ?? 0"
			:editable="editable"
			@remove="unrelate('subtask', subtask)"
		/>
		<form
			v-if="editable"
			class="
				-mx-2 flex min-h-9 items-center gap-2.5 rounded-md px-2 text-ink-faint
				focus-within:bg-canvas-subtle
				pointer-coarse:min-h-11
			"
			@submit.prevent="addSubtask"
		>
			<UiSpinner v-if="adding" />
			<UiIcon
				v-else
				:icon="Plus"
			/>
			<input
				ref="subtaskInput"
				v-model="newSubtask"
				type="text"
				enterkeyhint="done"
				:aria-label="t('taskDetail.relations.addSubtask')"
				:placeholder="t('taskDetail.relations.addSubtask')"
				class="
					min-w-0 flex-1 bg-transparent text-base text-ink
					placeholder:text-ink-faint
					focus:outline-none
					pointer-coarse:text-lg
				"
			>
		</form>
	</DetailSection>

	<DetailSection
		v-if="others.length"
		:title="t('taskDetail.relations.title')"
	>
		<div
			v-for="group in others"
			:key="group.kind"
			class="pb-1"
		>
			<p class="pt-1 pb-0.5 caption">
				{{ t(`taskDetail.relations.kinds.${group.kind}`) }}
			</p>
			<RelatedTaskRow
				v-for="related in group.tasks"
				:key="related.id"
				:task="related"
				:project-id="task.project_id ?? 0"
				:editable="editable"
				@remove="unrelate(group.kind, related)"
			/>
		</div>
	</DetailSection>
</template>
