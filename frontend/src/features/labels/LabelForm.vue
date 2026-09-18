<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'

import {toCssHex} from '@/helpers/color/toCssHex'
import UiColorSwatches from '@/ui/UiColorSwatches.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiTextarea from '@/ui/UiTextarea.vue'

export interface LabelFormValue {
	title: string
	hex_color: string
	description: string
}

/** A label's name, color and note. The page owns the submit button. */
defineProps<{
	formId: string
}>()

const emit = defineEmits<{
	submit: []
}>()

const model = defineModel<LabelFormValue>({required: true})

const {t} = useI18n()
const touched = ref(false)
const titleError = computed(() => touched.value && model.value.title.trim() === '' ? t('labels.titleRequired') : undefined)

const color = computed({
	get: () => toCssHex(model.value.hex_color) ?? '',
	set: hex => model.value = {...model.value, hex_color: hex},
})

function submit() {
	touched.value = true
	if (model.value.title.trim() !== '') {
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
			:label="t('labels.titleLabel')"
			:error="titleError"
			required
		>
			<UiInput
				v-model="model.title"
				data-autofocus
				autocomplete="off"
				@blur="touched = true"
			/>
		</UiField>
		<UiField :label="t('labels.color')">
			<UiColorSwatches
				v-model="color"
				:label="t('labels.color')"
			/>
		</UiField>
		<UiField :label="t('labels.description')">
			<UiTextarea
				v-model="model.description"
				rows="2"
			/>
		</UiField>
	</form>
</template>
