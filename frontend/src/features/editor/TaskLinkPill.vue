<script setup lang="ts">
import {computed, inject} from 'vue'
import {Check} from '@lucide/vue'

import {useProjects} from '@/composables/useProjects'
import {useTask} from '@/composables/useTask'
import {getProjectTitle} from '@/helpers/getProjectTitle'
import {parseTaskIdFromUrl} from '@/helpers/parseTaskIdFromUrl'
import {getTaskIdentifier} from '@/modules/task/task'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

import {taskLinkCurrentProjectIdKey} from './taskLinkContext'

const props = withDefaults(defineProps<{
	href: string
	selected?: boolean
}>(), {
	selected: false,
})

const emit = defineEmits<{
	open: [taskId: number]
}>()

const taskId = computed(() => parseTaskIdFromUrl(props.href))

const {task, isPending} = useTask(() => taskId.value ?? 0)

const projects = useProjects()
const currentProjectId = inject(taskLinkCurrentProjectIdKey, null)

const projectPrefix = computed(() => {
	const projectId = task.value?.project_id
	if (projectId === undefined || projectId === currentProjectId?.value) {
		return ''
	}
	const project = projects.projects[projectId]
	return project ? getProjectTitle(project) : ''
})

function onClick(event: MouseEvent) {
	// Modified clicks open a new tab the browser's way.
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return
	}
	event.preventDefault()
	if (taskId.value !== null) {
		emit('open', taskId.value)
	}
}
</script>

<template>
	<span v-if="taskId === null">{{ href }}</span>
	<a
		v-else-if="task"
		:href="href"
		:title="task.title"
		:class="cn(
			'inline-flex max-w-full items-baseline gap-1.5 rounded-sm border border-line bg-canvas-subtle px-1.5 align-baseline',
			'leading-snug text-ink no-underline transition-colors duration-150 hover:border-line-strong',
			selected && 'outline-2 outline-accent',
		)"
		@click="onClick"
	>
		<span
			v-if="projectPrefix"
			class="shrink-0 text-xs text-ink-faint"
		>{{ projectPrefix }} ›</span>
		<span class="shrink-0 font-mono text-xs text-ink-faint">{{ getTaskIdentifier(task) }}</span>
		<span :class="cn('min-w-0 truncate', task.done && 'text-ink-muted line-through')">{{ task.title }}</span>
		<UiIcon
			v-if="task.done"
			:icon="Check"
			:label="$t('task.attributes.done')"
			size="xs"
			:stroke="2.5"
			class="self-center text-success"
		/>
	</a>
	<a
		v-else
		:href="href"
		target="_blank"
		rel="noopener noreferrer nofollow"
		:class="cn('break-all', isPending && 'text-ink-faint', selected && 'outline-2 outline-accent')"
	>{{ href }}</a>
</template>
