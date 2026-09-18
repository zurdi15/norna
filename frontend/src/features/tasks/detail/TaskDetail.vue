<script setup lang="ts">
import {computed, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import type {TaskDetail} from '@/client/queries/tasks'
import {PERMISSIONS} from '@/constants/permissions'
import {formatDateSince} from '@/helpers/time/formatDate'
import {getDisplayName} from '@/modules/user/displayName'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'

import TaskActivity from '../activity/TaskActivity.vue'
import ReactionBar from '../activity/ReactionBar.vue'
import TaskAttachments from '../attachments/TaskAttachments.vue'
import TaskDescription from './TaskDescription.vue'
import TaskDetailHeader from './TaskDetailHeader.vue'
import TaskProperties from './TaskProperties.vue'
import TaskRelations from './TaskRelations.vue'
import TaskTitle from './TaskTitle.vue'
import {useTaskDetailShortcuts} from './useTaskDetailShortcuts'

/**
 * A task as a document: title, properties, then the long-form parts. The same
 * content fills the side panel on wide screens and a page on phones.
 */
const props = defineProps<{
	task: TaskDetail
	inPanel: boolean
}>()

const emit = defineEmits<{
	close: []
}>()

const {t} = useI18n()
const router = useRouter()
const actions = useTaskActionsStore()

const properties = useTemplateRef<InstanceType<typeof TaskProperties>>('properties')
const relations = useTemplateRef<InstanceType<typeof TaskRelations>>('relations')
const attachments = useTemplateRef<InstanceType<typeof TaskAttachments>>('attachments')

const editable = computed(() => (props.task.max_permission ?? PERMISSIONS.READ_WRITE) >= PERMISSIONS.READ_WRITE)

// A deleted task has nothing left to show: back to where it was opened from.
function leave() {
	if (props.inPanel) {
		emit('close')
	} else if (window.history.state?.back) {
		router.back()
	} else {
		void router.push({name: 'home'})
	}
}

async function remove() {
	if (await actions.deleteTask(props.task)) {
		leave()
	}
}

const editing = (handler: () => void) => () => {
	if (editable.value) {
		handler()
	}
}

useTaskDetailShortcuts({
	done: editing(() => actions.setDone(props.task, !props.task.done)),
	favorite: () => actions.toggleFavorite(props.task),
	priority: editing(() => properties.value?.openProperty('priority')),
	labels: editing(() => properties.value?.openProperty('labels')),
	assignees: editing(() => properties.value?.openProperty('assignees')),
	dueDate: editing(() => properties.value?.openProperty('dueDate')),
	reminder: editing(() => properties.value?.openProperty('reminders')),
	color: editing(() => properties.value?.openProperty('color')),
	moveProject: editing(() => properties.value?.openProperty('project')),
	attachments: editing(() => attachments.value?.pick()),
	relatedTasks: editing(() => relations.value?.link()),
	openProject: () => void router.push({name: 'project.index', params: {projectId: props.task.project_id}}),
	delete: editing(() => void remove()),
})

const createdLine = computed(() => {
	const by = props.task.created_by ? getDisplayName(props.task.created_by) : ''
	const created = props.task.created ? formatDateSince(props.task.created) : ''
	return by ? t('taskDetail.createdBy', {date: created, user: by}) : t('taskDetail.created', {date: created})
})
const updatedLine = computed(() => props.task.updated && props.task.updated !== props.task.created
	? t('taskDetail.updated', {date: formatDateSince(props.task.updated)})
	: '')
</script>

<template>
	<TaskDetailHeader
		:task="task"
		:in-panel="inPanel"
		@close="emit('close')"
		@deleted="leave"
	/>
	<article :class="cn('pb-12', inPanel ? 'px-5' : 'mx-auto max-w-3xl px-4 md:px-6')">
		<TaskTitle
			:task="task"
			:editable="editable"
		/>
		<TaskProperties
			ref="properties"
			:task="task"
			:editable="editable"
		/>
		<ReactionBar
			v-if="task.id !== undefined"
			:target="{kind: 'tasks', taskId: task.id}"
			:reactions="task.reactions"
			:editable="editable"
			class="pt-1"
		/>
		<TaskDescription
			:task="task"
			:editable="editable"
		/>
		<TaskRelations
			ref="relations"
			:task="task"
			:editable="editable"
		/>
		<TaskAttachments
			ref="attachments"
			:task="task"
			:editable="editable"
		/>
		<TaskActivity
			:task="task"
			:editable="editable"
		/>
		<p class="pt-8 font-mono text-2xs text-ink-faint">
			{{ createdLine }}<template v-if="updatedLine">
				· {{ updatedLine }}
			</template>
		</p>
	</article>
</template>
