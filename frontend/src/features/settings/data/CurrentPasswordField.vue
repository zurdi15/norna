<script setup lang="ts">
import {useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'

import PasswordInput from '@/features/auth/PasswordInput.vue'
import UiField from '@/ui/UiField.vue'

/** The account's password, asked before a request that must come from its owner. Attributes go to the input. */
withDefaults(defineProps<{
	error?: string
	hint?: string
}>(), {
	error: undefined,
	hint: undefined,
})

defineOptions({inheritAttrs: false})

const model = defineModel<string>({default: ''})

const {t} = useI18n()
const input = useTemplateRef<InstanceType<typeof PasswordInput>>('input')

defineExpose({
	focus: () => input.value?.focus(),
	readValue: () => input.value?.readValue() ?? model.value,
})
</script>

<template>
	<UiField
		:label="t('settingsData.password.label')"
		:hint="hint"
		:error="error"
	>
		<PasswordInput
			v-bind="$attrs"
			ref="input"
			v-model="model"
			autocomplete="current-password"
		/>
	</UiField>
</template>
