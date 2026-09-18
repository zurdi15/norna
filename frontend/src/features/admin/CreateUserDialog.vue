<script setup lang="ts">
import {computed, reactive, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useCreateAdminUserMutation} from '@/client/queries/admin'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

/** Creates a local account, even with public registration off. */
const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const create = useCreateAdminUserMutation()
const formId = useId()

function emptyForm() {
	return {username: '', email: '', name: '', password: '', isAdmin: false, skipEmailConfirm: true}
}
const form = reactive(emptyForm())
const submitted = ref(false)

// Nothing typed survives closing, the password least of all.
watch(open, isOpen => {
	if (!isOpen) {
		Object.assign(form, emptyForm())
		submitted.value = false
		create.reset()
	}
})

const MIN_PASSWORD = 8

const errors = computed(() => submitted.value
	? {
		username: form.username.trim() === '' ? t('admin.users.form.usernameRequired') : undefined,
		email: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? t('admin.users.form.emailInvalid') : undefined,
		password: form.password.length < MIN_PASSWORD ? t('admin.users.form.passwordTooShort', {count: MIN_PASSWORD}) : undefined,
	}
	: {})

async function submit() {
	submitted.value = true
	if (Object.values(errors.value).some(Boolean)) {
		return
	}
	try {
		await create.mutateAsync({
			username: form.username.trim(),
			email: form.email.trim(),
			password: form.password,
			...(form.name.trim() ? {name: form.name.trim()} : {}),
			is_admin: form.isAdmin,
			skip_email_confirm: form.skipEmailConfirm,
		})
		open.value = false
	} catch {
		// Reported by the mutation; the form stays for another try.
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('admin.users.new')"
	>
		<form
			:id="formId"
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiField
				:label="t('admin.users.form.username')"
				:error="errors.username"
				required
			>
				<UiInput
					v-model="form.username"
					type="text"
					autocomplete="off"
					autocapitalize="none"
					spellcheck="false"
				/>
			</UiField>
			<UiField
				:label="t('admin.users.form.email')"
				:error="errors.email"
				required
			>
				<UiInput
					v-model="form.email"
					type="email"
					autocomplete="off"
				/>
			</UiField>
			<UiField
				:label="t('admin.users.form.name')"
				:hint="t('admin.users.form.optional')"
			>
				<UiInput
					v-model="form.name"
					type="text"
					autocomplete="off"
				/>
			</UiField>
			<UiField
				:label="t('admin.users.form.password')"
				:error="errors.password"
				required
			>
				<PasswordInput
					v-model="form.password"
					autocomplete="new-password"
				/>
			</UiField>
			<div class="grid gap-3 pt-1">
				<UiCheckbox v-model="form.skipEmailConfirm">
					{{ t('admin.users.form.skipEmailConfirm') }}
				</UiCheckbox>
				<UiCheckbox v-model="form.isAdmin">
					{{ t('admin.users.form.isAdmin') }}
				</UiCheckbox>
			</div>
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
				:loading="create.isPending.value"
			>
				{{ t('admin.users.form.create') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
