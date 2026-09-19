<script setup lang="ts">
import {ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {createProjectDraft, useUpdateProjectMutation} from '@/client/queries/projects'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ProjectForm, {type ProjectFormValue} from '@/features/projects/ProjectForm.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

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
const update = useUpdateProjectMutation(t('projectSettings.saved'))
useTitle(() => t('projectSettings.editTitle', {project: project.value.title}))

const draft = ref<ProjectFormValue | null>(null)
watch(isLoaded, loaded => {
	if (loaded && !draft.value) {
		const {title, identifier, hex_color, parent_project_id, description} = project.value
		draft.value = {title, identifier, hex_color, parent_project_id, description}
	}
}, {immediate: true})

function leave() {
	if (props.inModal) {
		emit('close')
	} else {
		void router.push({name: 'project.index', params: {projectId: props.projectId}})
	}
}

async function submit() {
	if (!draft.value) {
		return
	}
	try {
		// PUT replaces the project, so the fields the form doesn't show go back as they were.
		await update.mutateAsync({
			...createProjectDraft({
				is_archived: project.value.is_archived,
				is_favorite: project.value.is_favorite,
				position: project.value.position,
			}),
			...draft.value,
			title: draft.value.title.trim(),
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
		:title="t('projectSettings.editTitle', {project: project.title})"
		:in-modal="inModal"
	>
		<ProjectForm
			v-if="draft"
			v-model="draft"
			form-id="project-edit"
			:project-id="projectId"
			@submit="submit"
		/>
		<div
			v-else
			class="grid gap-4"
			aria-hidden="true"
		>
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-24" />
		</div>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="leave"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				form="project-edit"
				variant="primary"
				:disabled="!draft"
				:loading="update.isPending.value"
			>
				{{ t('projectSettings.save') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
