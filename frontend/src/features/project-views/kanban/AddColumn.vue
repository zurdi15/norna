<script setup lang="ts">
import {nextTick, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {positionForIndex, useCreateBucketMutation} from '@/client/queries/taskBoard'
import UiButton from '@/ui/UiButton.vue'
import UiInput from '@/ui/UiInput.vue'

import {useKanbanBoard} from './useKanbanBoard'

/** "+ Add column" after the last column; stays open to add several in a row. */
withDefaults(defineProps<{
	// The empty board shows it as its main action.
	prominent?: boolean
}>(), {
	prominent: false,
})

const emit = defineEmits<{
	created: []
}>()

const {t} = useI18n()
const board = useKanbanBoard()
const create = useCreateBucketMutation()

const open = ref(false)
const title = ref('')
const input = useTemplateRef<InstanceType<typeof UiInput>>('input')

async function start() {
	open.value = true
	await nextTick()
	input.value?.focus()
}

function close() {
	open.value = false
	title.value = ''
}

async function submit() {
	const text = title.value.trim()
	if (text === '' || create.isPending.value) {
		return
	}
	const buckets = board.buckets.value
	try {
		await create.mutateAsync({
			projectId: board.projectId.value,
			viewId: board.viewId.value,
			bucket: {title: text, position: positionForIndex(buckets, buckets.length)},
		})
	} catch {
		return
	}
	if (title.value.trim() === text) {
		title.value = ''
	}
	emit('created')
	input.value?.focus()
}

function onBlur() {
	if (title.value.trim() === '' && !create.isPending.value) {
		close()
	}
}
</script>

<template>
	<form
		v-if="open"
		class="grid gap-2"
		@submit.prevent="submit"
	>
		<UiInput
			ref="input"
			v-model="title"
			:aria-label="t('kanban.columnTitle')"
			:placeholder="t('kanban.columnTitle')"
			enterkeyhint="done"
			autocomplete="off"
			@keydown.esc.prevent="close"
			@blur="onBlur"
		/>
		<p class="px-0.5 font-mono text-2xs text-ink-faint">
			{{ t('kanban.addColumnHint') }}
		</p>
	</form>
	<UiButton
		v-else
		:variant="prominent ? 'primary' : 'ghost'"
		:icon="Plus"
		:class="prominent ? undefined : 'w-full justify-start text-ink-faint'"
		@click="start"
	>
		{{ t('kanban.addColumn') }}
	</UiButton>
</template>
