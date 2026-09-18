<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {X} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {useProjects} from '@/composables/useProjects'
import {getTaskIdentifier} from '@/modules/task/task'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import UiIconButton from '@/ui/UiIconButton.vue'

import TaskCheck from '../TaskCheck.vue'
import {useTaskLink} from '../useTaskLink'

/** A task related to the open one: tick it, open it, or undo the relation. */
const props = defineProps<{
	task: Task
	// The open task's project: others are named, as the identifier alone doesn't say where they live.
	projectId: number
	editable: boolean
}>()

const emit = defineEmits<{
	remove: []
}>()

const {t} = useI18n()
const projects = useProjects()
const actions = useTaskActionsStore()
const taskLink = useTaskLink()

const otherProject = computed(() => props.task.project_id !== props.projectId
	? projects.projects[props.task.project_id ?? 0]
	: undefined)
</script>

<template>
	<div
		class="
			group/related relative -mx-2 flex min-h-9 items-center gap-2.5 rounded-md px-2
			hover:bg-canvas-subtle
			pointer-coarse:min-h-11
		"
	>
		<TaskCheck
			:model-value="task.done ?? false"
			:priority="task.priority"
			:label="t(task.done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: task.title})"
			:disabled="!editable"
			size="sm"
			class="z-10"
			@update:modelValue="done => actions.setDone(task, done)"
		/>
		<span class="w-12 shrink-0 truncate font-mono text-2xs text-ink-faint">{{ getTaskIdentifier(task) }}</span>
		<RouterLink
			:to="taskLink(task.id ?? 0)"
			:class="cn(
				'min-w-0 flex-1 truncate text-base after:absolute after:inset-0 focus-visible:outline-none',
				'focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-accent',
				'pointer-coarse:text-md',
				task.done && 'text-ink-faint line-through decoration-line-strong',
			)"
		>
			{{ task.title }}
		</RouterLink>
		<span
			v-if="otherProject"
			class="max-w-32 shrink-0 truncate text-xs text-ink-faint"
		>{{ otherProject.title }}</span>
		<UiIconButton
			v-if="editable"
			:icon="X"
			:label="t('taskDetail.relations.remove', {title: task.title})"
			size="sm"
			class="z-10 shrink-0 opacity-0 group-hover/related:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
			@click="emit('remove')"
		/>
	</div>
</template>
