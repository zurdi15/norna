<script setup lang="ts">
import {nextTick, ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useTextareaAutosize} from '@vueuse/core'

import type {TaskDetail} from '@/client/queries/tasks'
import {error} from '@/message'
import {useTaskActionsStore} from '@/stores/taskActions'

import TaskCheck from '../TaskCheck.vue'

/** The task's check and its title, edited in place like a document heading. */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const actions = useTaskActionsStore()

const draft = ref('')
const input = useTemplateRef<HTMLTextAreaElement>('input')
useTextareaAutosize({element: input, input: draft})

// Someone else's change (or the server's cleanup) replaces the draft unless the user is typing.
watch(() => props.task.title, title => {
	if (!input.value || document.activeElement !== input.value) {
		draft.value = title ?? ''
	}
}, {immediate: true})

async function save() {
	const title = draft.value.replace(/\s+/g, ' ').trim()
	if (title === (props.task.title ?? '')) {
		draft.value = title
		return
	}
	if (title === '') {
		error(t('taskDetail.titleRequired'))
		draft.value = props.task.title ?? ''
		return
	}
	draft.value = title
	await actions.update(props.task, {title})
}

function revert() {
	draft.value = props.task.title ?? ''
	void nextTick(() => input.value?.blur())
}
</script>

<template>
	<div class="flex items-start gap-3 pt-5 pb-2">
		<TaskCheck
			:model-value="task.done ?? false"
			:priority="task.priority"
			:label="t(task.done ? 'tasks.row.markUndone' : 'tasks.row.markDone', {title: task.title})"
			:disabled="!editable"
			size="lg"
			class="mt-1"
			@update:modelValue="done => actions.setDone(task, done)"
		/>
		<!-- A textarea so long titles wrap; Enter still saves, as a title has one line. -->
		<textarea
			ref="input"
			v-model="draft"
			rows="1"
			:readonly="!editable"
			:aria-label="t('taskDetail.titleLabel')"
			class="
				min-w-0 flex-1 resize-none bg-transparent text-2xl/tight font-semibold tracking-tight text-balance
				focus:outline-none
			"
			:class="[
				task.done && 'text-ink-muted',
			]"
			@keydown.enter.prevent="input?.blur()"
			@keydown.escape.stop="revert"
			@blur="save"
		/>
	</div>
</template>
