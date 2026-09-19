<script setup lang="ts">
import {ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import type {TaskDetail} from '@/client/queries/tasks'
import TaskEditor from '@/features/editor/TaskEditor.vue'
import {isEditorContentEmpty} from '@/helpers/editorContentEmpty'
import {useTaskActionsStore} from '@/stores/taskActions'

import DetailSection from './DetailSection.vue'

/** The task's description, always editable in place; it saves when the editor lets go. */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const actions = useTaskActionsStore()

const draft = ref('')
const editor = useTemplateRef<InstanceType<typeof TaskEditor>>('editor')
const status = ref<'idle' | 'saving' | 'saved'>('idle')
let editing = false

// A newer description from the server replaces the draft unless the user is in the middle of editing.
watch(() => props.task.description, description => {
	if (!editing) {
		draft.value = description ?? ''
	}
}, {immediate: true})

function markEditing() {
	editing = true
}

defineExpose({
	focus: () => editor.value?.focus('end'),
})

async function save(value: string) {
	editing = false
	// An emptied editor still holds "<p></p>"; the api should store nothing.
	const description = isEditorContentEmpty(value) ? '' : value
	if (description === (props.task.description ?? '')) {
		return
	}
	status.value = 'saving'
	await actions.update(props.task, {description})
	status.value = 'saved'
	setTimeout(() => {
		if (status.value === 'saved') {
			status.value = 'idle'
		}
	}, 2000)
}
</script>

<template>
	<DetailSection
		v-if="editable || !isEditorContentEmpty(task.description ?? '')"
		:title="t('taskDetail.description.title')"
	>
		<template #actions>
			<span
				v-if="status !== 'idle'"
				class="font-mono text-2xs text-ink-faint"
				role="status"
			>{{ status === 'saving' ? t('taskDetail.description.saving') : t('taskDetail.description.saved') }}</span>
		</template>
		<TaskEditor
			ref="editor"
			v-model="draft"
			:task-id="task.id"
			:editable="editable"
			:checkable="editable"
			:placeholder="t('taskDetail.description.placeholder')"
			variant="description"
			@update:modelValue="markEditing"
			@save="save"
			@cancel="save(draft)"
		/>
	</DetailSection>
</template>
