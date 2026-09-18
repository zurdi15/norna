<script setup lang="ts">
import {watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {SearchX} from '@lucide/vue'

import {useMarkTaskReadMutation} from '@/client/queries/tasks'
import {useTask} from '@/composables/useTask'
import {useTitle} from '@/composables/useTitle'
import TaskDetail from '@/features/tasks/detail/TaskDetail.vue'
import TaskDetailSkeleton from '@/features/tasks/detail/TaskDetailSkeleton.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'

const props = withDefaults(defineProps<{
	taskId: number
	// Set by the shell when the task shows beside the page it was opened from.
	inPanel?: boolean
}>(), {
	inPanel: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const {task, isPending, isNotFound} = useTask(() => props.taskId)
const markRead = useMarkTaskReadMutation()

useTitle(() => task.value?.title ?? t('taskDetail.title'))

// Opening a task with news (a comment, a change) marks it read.
watch(() => task.value?.is_unread ? task.value.id : undefined, id => {
	if (id !== undefined) {
		markRead.mutate(id)
	}
}, {immediate: true})
</script>

<template>
	<TaskDetail
		v-if="task"
		:task="task"
		:in-panel="inPanel"
		@close="emit('close')"
	/>
	<TaskDetailSkeleton
		v-else-if="isPending"
		:in-panel="inPanel"
	/>
	<UiEmptyState
		v-else
		:title="isNotFound ? t('taskDetail.notFound') : t('taskDetail.loadFailed')"
		:description="isNotFound ? t('taskDetail.notFoundDescription') : undefined"
		class="py-20"
	>
		<template #illustration>
			<UiIcon
				:icon="SearchX"
				size="xl"
				class="mb-4 text-ink-faint"
			/>
		</template>
		<template #actions>
			<UiButton
				v-if="inPanel"
				@click="emit('close')"
			>
				{{ t('taskDetail.close') }}
			</UiButton>
			<UiButton
				v-else
				:as="RouterLink"
				:to="{name: 'home'}"
			>
				{{ t('notFound.home') }}
			</UiButton>
		</template>
	</UiEmptyState>
</template>
