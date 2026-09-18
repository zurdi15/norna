<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {createProjectDraft, useUpdateProjectMutation} from '@/client/queries/projects'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'

/** Archiving keeps a project and its tasks but takes them out of the way, read-only. */
const props = withDefaults(defineProps<{
	projectId: number
	inModal?: boolean
}>(), {
	inModal: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const {project, isLoaded} = useProject(() => props.projectId)
const update = useUpdateProjectMutation()
useTitle(() => project.value.is_archived ? t('projectSettings.unarchiveTitle') : t('projectSettings.archiveTitle'))

function leave() {
	if (props.inModal) {
		emit('close')
	} else {
		void router.push({name: 'project.index', params: {projectId: props.projectId}})
	}
}

async function toggle() {
	const {title, description, hex_color, identifier, is_favorite, parent_project_id, position, is_archived} = project.value
	try {
		await update.mutateAsync({
			...createProjectDraft({title, description, hex_color, identifier, is_favorite, parent_project_id, position}),
			is_archived: !is_archived,
			id: props.projectId,
		})
		leave()
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="project.is_archived ? t('projectSettings.unarchiveTitle') : t('projectSettings.archiveTitle')"
		:in-modal="inModal"
	>
		<p class="text-base text-pretty text-ink-muted">
			{{ project.is_archived
				? t('projectSettings.unarchiveDescription', {project: project.title})
				: t('projectSettings.archiveDescription', {project: project.title}) }}
		</p>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="leave"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				:disabled="!isLoaded"
				:loading="update.isPending.value"
				data-autofocus
				@click="toggle"
			>
				{{ project.is_archived ? t('projectSettings.unarchive') : t('projectSettings.archive') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
