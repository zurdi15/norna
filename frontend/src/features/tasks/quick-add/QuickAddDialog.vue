<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'

import {SHORTCUTS} from '@/constants/shortcuts'
import {useProjects} from '@/composables/useProjects'
import {useAuthStore} from '@/stores/auth'
import {useShellStore} from '@/stores/shell'
import UiDialog from '@/ui/UiDialog.vue'

import QuickAddComposer from './QuickAddComposer.vue'

/**
 * The global quick add: N anywhere, the + of the bottom bar, or the palette. New tasks
 * land in the project on screen, else the user's default project, else the first one.
 */
const {t} = useI18n()
const route = useRoute()
const shell = useShellStore()
const authStore = useAuthStore()
const projects = useProjects()

const defaultProjectId = computed(() => {
	const onScreen = Number(route.params.projectId)
	if (onScreen > 0 && projects.projects[onScreen]) {
		return onScreen
	}
	const preferred = authStore.settings.default_project_id
	if (preferred > 0 && projects.projects[preferred]) {
		return preferred
	}
	return projects.notArchivedRootProjects[0]?.id ?? 0
})
</script>

<template>
	<!-- Hidden trigger so the shortcut works from anywhere. -->
	<button
		v-shortcut="SHORTCUTS.newTask"
		type="button"
		class="sr-only"
		tabindex="-1"
		@click="shell.quickAddOpen = true"
	>
		{{ t('quickAdd.title') }}
	</button>
	<UiDialog
		v-model:open="shell.quickAddOpen"
		:title="t('quickAdd.title')"
		hide-title
		position="top"
		body-class="p-0"
	>
		<QuickAddComposer :default-project-id="defaultProjectId" />
	</UiDialog>
</template>
