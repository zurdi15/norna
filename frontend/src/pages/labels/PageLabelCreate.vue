<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {useCreateLabelMutation} from '@/client/queries/labels'
import {useTitle} from '@/composables/useTitle'
import LabelForm, {type LabelFormValue} from '@/features/labels/LabelForm.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import {getRandomColorHex} from '@/helpers/color/randomColor'
import {error} from '@/message'
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
const create = useCreateLabelMutation()
useTitle(() => t('labels.new'))

const draft = ref<LabelFormValue>({title: '', hex_color: getRandomColorHex(), description: ''})

function leave() {
	if (props.inModal) {
		emit('close')
	} else {
		void router.push({name: 'labels.index'})
	}
}

async function submit() {
	try {
		await create.mutateAsync({...draft.value, title: draft.value.title.trim()})
		leave()
	} catch (cause) {
		error(cause)
	}
}
</script>

<template>
	<ModalPage
		:title="t('labels.new')"
		:in-modal="inModal"
		:back="{name: 'labels.index'}"
	>
		<LabelForm
			v-model="draft"
			form-id="label-create"
			@submit="submit"
		/>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="leave"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				form="label-create"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('labels.create') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
