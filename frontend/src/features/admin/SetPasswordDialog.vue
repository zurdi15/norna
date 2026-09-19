<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useSetUserPasswordMutation, type AdminUserWithId} from '@/client/queries/admin'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'

/** Sets a new password for a local account; the server then signs the user out everywhere. */
const props = defineProps<{
	user: AdminUserWithId | null
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const setPassword = useSetUserPasswordMutation()
const formId = useId()

const password = ref('')
const submitted = ref(false)

watch(open, isOpen => {
	if (!isOpen) {
		password.value = ''
		submitted.value = false
		setPassword.reset()
	}
})

const MIN_PASSWORD = 8
const error = computed(() => submitted.value && password.value.length < MIN_PASSWORD
	? t('admin.users.form.passwordTooShort', {count: MIN_PASSWORD})
	: undefined)

async function submit() {
	submitted.value = true
	if (error.value || !props.user) {
		return
	}
	try {
		await setPassword.mutateAsync({id: props.user.id, password: password.value})
		open.value = false
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('admin.users.setPasswordTitle', {username: user?.username ?? ''})"
		:description="t('admin.users.setPasswordDescription')"
		size="sm"
	>
		<form
			:id="formId"
			novalidate
			@submit.prevent="submit"
		>
			<UiField
				:label="t('admin.users.form.newPassword')"
				:error="error"
			>
				<PasswordInput
					v-model="password"
					autocomplete="new-password"
				/>
			</UiField>
		</form>
		<template #footer="{close}">
			<UiButton
				variant="ghost"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				:form="formId"
				variant="primary"
				:loading="setPassword.isPending.value"
			>
				{{ t('admin.users.setPassword') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
