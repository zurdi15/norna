<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Eye, EyeOff} from '@lucide/vue'

import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'

defineOptions({inheritAttrs: false})

const model = defineModel<string>({default: ''})

const {t} = useI18n()
const visible = ref(false)
const field = ref<InstanceType<typeof UiInput> | null>(null)

defineExpose({
	// Autofill can fill the field without firing input events in some browsers.
	readValue: () => field.value?.input?.value ?? model.value,
	focus: () => field.value?.focus(),
})
</script>

<template>
	<UiInput
		ref="field"
		v-model="model"
		v-bind="$attrs"
		:type="visible ? 'text' : 'password'"
	>
		<template #trailing>
			<button
				type="button"
				class="
					-me-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-faint
					hover:text-ink
					pointer-coarse:size-9
				"
				:aria-label="visible ? t('auth.hidePassword') : t('auth.showPassword')"
				:aria-pressed="visible"
				@click="visible = !visible"
			>
				<UiIcon :icon="visible ? EyeOff : Eye" />
			</button>
		</template>
	</UiInput>
</template>
