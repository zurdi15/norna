<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {useQuickAddTaskMutation} from '@/client/queries/tasks'
import {useQuickAddSettings} from '@/features/tasks/useQuickAddSettings'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

/** Adds a task to the project from the top of its list; quick add magic works here too. */
const props = defineProps<{
	projectId: number
}>()

const {t} = useI18n()
const settings = useQuickAddSettings()
const quickAdd = useQuickAddTaskMutation()
const title = ref('')

async function add() {
	const text = title.value.trim()
	if (text === '' || quickAdd.isPending.value) {
		return
	}
	try {
		await quickAdd.mutateAsync({...settings.value, title: text, projectId: props.projectId})
		title.value = ''
	} catch {
		// Reported by the mutation; the text stays to try again.
	}
}
</script>

<template>
	<form
		class="flex h-9 items-center gap-2.5 rounded-md px-1 text-ink-faint focus-within:bg-canvas-subtle pointer-coarse:h-11"
		@submit.prevent="add"
	>
		<UiSpinner v-if="quickAdd.isPending.value" />
		<UiIcon
			v-else
			:icon="Plus"
		/>
		<input
			v-model="title"
			type="text"
			enterkeyhint="done"
			:aria-label="t('projectView.list.add')"
			:placeholder="t('projectView.list.add')"
			class="
				min-w-0 flex-1 bg-transparent text-base text-ink
				placeholder:text-ink-faint
				focus:outline-none
				pointer-coarse:text-lg
			"
		>
	</form>
</template>
