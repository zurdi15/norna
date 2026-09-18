<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {getSavedFilterIdFromProjectId} from '@/client/queries/projects'
import {useUpdateSavedFilterMutation} from '@/client/queries/savedFilters'
import {useSavedFilter} from '@/composables/useSavedFilter'
import {useTitle} from '@/composables/useTitle'
import SavedFilterForm from '@/features/filters/SavedFilterForm.vue'
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
const update = useUpdateSavedFilterMutation()
const {filter, isLoaded, validate} = useSavedFilter(() => props.projectId)
useTitle(() => t('savedFilters.editTitle'))

function leave() {
	if (props.inModal) {
		emit('close')
	} else {
		void router.push({name: 'project.index', params: {projectId: props.projectId}})
	}
}

async function submit() {
	const payload = validate()
	if (!payload) {
		return
	}
	try {
		await update.mutateAsync({...payload, id: getSavedFilterIdFromProjectId(props.projectId)})
		leave()
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('savedFilters.editTitle')"
		:in-modal="inModal"
	>
		<SavedFilterForm
			v-if="isLoaded"
			v-model="filter"
			form-id="saved-filter-edit"
			@submit="submit"
		/>
		<div
			v-else
			class="grid gap-4"
			aria-hidden="true"
		>
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-16" />
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
				form="saved-filter-edit"
				variant="primary"
				:disabled="!isLoaded"
				:loading="update.isPending.value"
			>
				{{ t('projectSettings.save') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
