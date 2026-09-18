<script setup lang="ts">
import {computed, ref} from 'vue'
import {RouterLink, useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {KeyRound} from '@lucide/vue'

import {authPasswordReset} from '@/client/generated'
import {useTitle} from '@/composables/useTitle'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {validatePassword} from '@/helpers/validatePassword'
import {getErrorText} from '@/message'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'

const {t} = useI18n()
useTitle(() => t('auth.reset.title'))

const route = useRoute()
const token = computed(() => route.query.userPasswordReset as string | undefined)

const password = ref('')
const touched = ref(false)
const errorMessage = ref('')
const done = ref(false)
const saving = ref(false)

const passwordError = computed(() => {
	const problem = validatePassword(password.value)
	return touched.value && problem !== true ? t(problem) : undefined
})

async function submit() {
	errorMessage.value = ''
	touched.value = true
	if (!token.value) {
		errorMessage.value = t('auth.reset.tokenMissing')
		return
	}
	if (validatePassword(password.value) !== true) {
		return
	}
	saving.value = true
	try {
		await authPasswordReset({body: {token: token.value, new_password: password.value}})
		done.value = true
	} catch (e) {
		errorMessage.value = getErrorText(e)
	} finally {
		saving.value = false
	}
}
</script>

<template>
	<AuthLayout
		:title="t('auth.reset.title')"
		:description="done ? undefined : t('auth.reset.description')"
	>
		<template v-if="done">
			<UiAlert tone="success">
				{{ t('auth.reset.done') }}
			</UiAlert>
			<UiButton
				:as="RouterLink"
				:to="{name: 'user.login'}"
				variant="primary"
				size="lg"
				block
				class="mt-5"
			>
				{{ t('auth.reset.backToLogin') }}
			</UiButton>
		</template>
		<form
			v-else
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>
			<UiField
				:label="t('auth.reset.newPassword')"
				:hint="t('auth.register.passwordHint')"
				:error="passwordError"
			>
				<PasswordInput
					v-model="password"
					autocomplete="new-password"
					required
					autofocus
					@blur="touched = true"
				/>
			</UiField>
			<UiButton
				type="submit"
				variant="primary"
				size="lg"
				block
				:loading="saving"
				:icon="KeyRound"
			>
				{{ t('auth.reset.save') }}
			</UiButton>
		</form>
	</AuthLayout>
</template>
