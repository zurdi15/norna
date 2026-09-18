<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {useCreateTeamMutation} from '@/client/queries/teams'
import {useTitle} from '@/composables/useTitle'
import ModalPage from '@/features/shell/ModalPage.vue'
import TeamForm, {type TeamFormValue} from '@/features/teams/TeamForm.vue'
import UiButton from '@/ui/UiButton.vue'

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
const create = useCreateTeamMutation()
useTitle(() => t('teams.new'))

const draft = ref<TeamFormValue>({name: '', description: '', is_public: false})

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		void router.push({name: 'teams.index'})
	}
}

async function submit() {
	try {
		const team = await create.mutateAsync({...draft.value, name: draft.value.name.trim()})
		await router.replace({name: 'teams.edit', params: {id: team.id}})
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('teams.new')"
		:in-modal="inModal"
		:back="{name: 'teams.index'}"
	>
		<TeamForm
			v-model="draft"
			form-id="team-create"
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
				form="team-create"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('teams.create') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
