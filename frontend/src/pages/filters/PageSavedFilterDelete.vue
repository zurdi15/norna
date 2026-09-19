<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {getSavedFilterIdFromProjectId} from '@/client/queries/projects'
import {useDeleteSavedFilterMutation} from '@/client/queries/savedFilters'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'

/** Deleting a saved filter only removes the query; its tasks stay in their projects. */
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
const {project} = useProject(() => props.projectId)
const remove = useDeleteSavedFilterMutation()
useTitle(() => t('savedFilters.deleteTitle'))

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		router.back()
	}
}

async function submit() {
	try {
		await remove.mutateAsync(getSavedFilterIdFromProjectId(props.projectId))
		await router.replace({name: 'projects.index'})
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('savedFilters.deleteTitle')"
		:in-modal="inModal"
	>
		<p class="text-base text-pretty text-ink-muted">
			{{ t('savedFilters.deleteDescription', {filter: project.title}) }}
		</p>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="cancel"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="danger"
				:loading="remove.isPending.value"
				@click="submit"
			>
				{{ t('savedFilters.delete') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
