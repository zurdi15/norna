<script setup lang="ts">
import {ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {createProjectDraft, useCreateProjectMutation} from '@/client/queries/projects'
import {useTitle} from '@/composables/useTitle'
import ProjectForm, {type ProjectFormValue} from '@/features/projects/ProjectForm.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'

const props = withDefaults(defineProps<{
	parentProjectId?: number
	inModal?: boolean
}>(), {
	parentProjectId: 0,
	inModal: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const create = useCreateProjectMutation()
useTitle(() => t('projects.new'))

const draft = ref<ProjectFormValue>({
	title: '',
	identifier: '',
	hex_color: '',
	parent_project_id: 0,
	description: '',
})
// "New project" inside another one starts there.
watch(() => props.parentProjectId, id => draft.value.parent_project_id = id, {immediate: true})

async function submit() {
	try {
		const created = await create.mutateAsync(createProjectDraft({...draft.value, title: draft.value.title.trim()}))
		// Replaces the dialog's entry, so going back doesn't reopen the form.
		await router.replace({name: 'project.index', params: {projectId: created.id}})
	} catch {
		// Reported by the mutation.
	}
}

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		router.back()
	}
}
</script>

<template>
	<ModalPage
		:title="t('projects.new')"
		:in-modal="inModal"
	>
		<ProjectForm
			v-model="draft"
			form-id="project-create"
			:show-description="false"
			@submit="submit"
		/>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="cancel"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				form="project-create"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('projectSettings.create') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
