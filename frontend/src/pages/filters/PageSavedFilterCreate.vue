<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {getProjectIdFromSavedFilterId} from '@/client/queries/projects'
import {useCreateSavedFilterMutation} from '@/client/queries/savedFilters'
import {useSavedFilterDraft} from '@/composables/useSavedFilter'
import {useTitle} from '@/composables/useTitle'
import SavedFilterForm from '@/features/filters/SavedFilterForm.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiButton from '@/ui/UiButton.vue'

/** A saved filter works like a project whose tasks come from a query, across all projects. */
const props = withDefaults(defineProps<{
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
const create = useCreateSavedFilterMutation()
const {filter, validate} = useSavedFilterDraft()
useTitle(() => t('savedFilters.new'))

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		router.back()
	}
}

async function submit() {
	const payload = validate()
	if (!payload) {
		return
	}
	try {
		const created = await create.mutateAsync(payload)
		await router.replace({name: 'project.index', params: {projectId: getProjectIdFromSavedFilterId(created.id)}})
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('savedFilters.new')"
		:in-modal="inModal"
	>
		<p class="text-sm text-pretty text-ink-muted">
			{{ t('savedFilters.explanation') }}
		</p>
		<SavedFilterForm
			v-model="filter"
			form-id="saved-filter-create"
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
				form="saved-filter-create"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('savedFilters.create') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
