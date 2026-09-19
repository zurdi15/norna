<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Send} from '@lucide/vue'

import {authPasswordToken} from '@/client/generated'
import {useTitle} from '@/composables/useTitle'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import {isEmail} from '@/helpers/isEmail'
import {getErrorText} from '@/message'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

const {t} = useI18n()
useTitle(() => t('auth.reset.requestTitle'))

const email = ref('')
const emailError = ref('')
const errorMessage = ref('')
const sent = ref(false)
const sending = ref(false)

async function submit() {
	errorMessage.value = ''
	emailError.value = isEmail(email.value) ? '' : t('auth.register.emailInvalid')
	if (emailError.value) {
		return
	}
	sending.value = true
	try {
		await authPasswordToken({body: {email: email.value}})
		sent.value = true
	} catch (e) {
		errorMessage.value = getErrorText(e)
	} finally {
		sending.value = false
	}
}
</script>

<template>
	<AuthLayout
		:title="t('auth.reset.requestTitle')"
		:description="sent ? undefined : t('auth.reset.requestDescription')"
	>
		<UiAlert
			v-if="sent"
			tone="success"
		>
			{{ t('auth.reset.sent') }}
		</UiAlert>
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
				:label="t('auth.register.email')"
				:error="emailError || undefined"
			>
				<UiInput
					v-model="email"
					type="email"
					inputmode="email"
					autocomplete="email"
					required
					autofocus
				/>
			</UiField>
			<UiButton
				type="submit"
				variant="primary"
				size="lg"
				block
				:loading="sending"
				:icon="Send"
			>
				{{ t('auth.reset.send') }}
			</UiButton>
		</form>
		<p class="mt-6 text-center text-sm">
			<RouterLink
				:to="{name: 'user.login'}"
				class="font-medium text-accent hover:underline"
			>
				{{ t('auth.reset.backToLogin') }}
			</RouterLink>
		</p>
	</AuthLayout>
</template>
