<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {useDeleteProjectMutation} from '@/client/queries/projects'
import {useProject} from '@/composables/useProject'
import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

/** Deleting takes the tasks and sub-projects with it, so the name has to be typed to confirm. */
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
const projects = useProjects()
const {project, isLoaded} = useProject(() => props.projectId)
const remove = useDeleteProjectMutation()
useTitle(() => t('projectSettings.deleteTitle'))

const typed = ref('')
const confirmed = computed(() => isLoaded.value && typed.value.trim() === project.value.title.trim())
const subprojects = computed(() => projects.getChildProjects(props.projectId).length)

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		router.back()
	}
}

async function submit() {
	if (!confirmed.value) {
		return
	}
	try {
		await remove.mutateAsync(props.projectId)
		await router.replace({name: 'projects.index'})
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('projectSettings.deleteTitle')"
		:in-modal="inModal"
	>
		<form
			id="project-delete"
			class="grid gap-4"
			@submit.prevent="submit"
		>
			<p class="text-base text-pretty text-ink-muted">
				{{ t('projectSettings.deleteDescription', {project: project.title}) }}
				<template v-if="subprojects">
					{{ t('projectSettings.deleteSubprojects', subprojects) }}
				</template>
			</p>
			<UiField :label="t('projectSettings.deleteConfirm', {project: project.title})">
				<UiInput
					v-model="typed"
					data-autofocus
					autocomplete="off"
					spellcheck="false"
				/>
			</UiField>
		</form>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="cancel"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				form="project-delete"
				variant="danger"
				:disabled="!confirmed"
				:loading="remove.isPending.value"
			>
				{{ t('projectSettings.delete') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
