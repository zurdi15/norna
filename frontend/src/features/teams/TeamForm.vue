<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'

import {useConfigStore} from '@/stores/config'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSwitch from '@/ui/UiSwitch.vue'
import UiTextarea from '@/ui/UiTextarea.vue'

export interface TeamFormValue {
	name: string
	description: string
	is_public: boolean
}

/** A team's name, note and whether others can find it. The page owns the submit button. */
withDefaults(defineProps<{
	formId: string
	disabled?: boolean
}>(), {
	disabled: false,
})

const emit = defineEmits<{
	submit: []
}>()

const model = defineModel<TeamFormValue>({required: true})

const {t} = useI18n()
const configStore = useConfigStore()
const touched = ref(false)
const nameError = computed(() => touched.value && model.value.name.trim() === '' ? t('teams.nameRequired') : undefined)

function submit() {
	touched.value = true
	if (model.value.name.trim() !== '') {
		emit('submit')
	}
}
</script>

<template>
	<form
		:id="formId"
		class="grid gap-5"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('teams.nameLabel')"
			:error="nameError"
			required
		>
			<UiInput
				v-model="model.name"
				:disabled="disabled"
				data-autofocus
				autocomplete="off"
				@blur="touched = true"
			/>
		</UiField>
		<UiField :label="t('teams.description')">
			<UiTextarea
				v-model="model.description"
				:disabled="disabled"
				rows="2"
			/>
		</UiField>
		<label
			v-if="configStore.public_teams_enabled"
			class="flex cursor-pointer items-start justify-between gap-4 text-base"
		>
			<span class="grid gap-0.5">
				{{ t('teams.public') }}
				<span class="text-sm text-ink-faint">{{ t('teams.publicHint') }}</span>
			</span>
			<UiSwitch
				v-model="model.is_public"
				:disabled="disabled"
			/>
		</label>
	</form>
</template>
