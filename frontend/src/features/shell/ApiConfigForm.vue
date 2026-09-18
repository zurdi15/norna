<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {parseURL} from 'ufo'
import {Server} from '@lucide/vue'

import {checkAndSetApiUrl} from '@/helpers/checkAndSetApiUrl'
import {success} from '@/message'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'

const emit = defineEmits<{
	found: [url: string]
}>()

const {t} = useI18n()

const apiUrl = ref(window.API_URL)
const error = ref('')
const checking = ref(false)

// Only used to name the host in messages, so a missing protocol is fine.
const apiDomain = computed(() => parseURL(apiUrl.value, 'http://').host || parseURL(window.location.href).host)

async function submit() {
	if (apiUrl.value.trim() === '') {
		error.value = t('shell.api.urlRequired')
		return
	}
	checking.value = true
	try {
		const url = await checkAndSetApiUrl(apiUrl.value.trim())
		if (url === '') {
			throw new Error('URL cannot be empty.')
		}
		error.value = ''
		apiUrl.value = url
		success({message: t('shell.api.connected', {domain: apiDomain.value})})
		emit('found', url)
	} catch {
		error.value = t('shell.api.unreachable', {domain: apiDomain.value})
	} finally {
		checking.value = false
	}
}
</script>

<template>
	<form
		class="grid gap-4"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('shell.api.url')"
			:hint="t('shell.api.urlHint')"
			:error="error || undefined"
		>
			<UiInput
				v-model="apiUrl"
				type="url"
				inputmode="url"
				autocomplete="url"
				placeholder="https://norna.example.com"
			>
				<template #leading>
					<UiIcon :icon="Server" />
				</template>
			</UiInput>
		</UiField>
		<UiButton
			type="submit"
			variant="primary"
			:loading="checking"
			block
		>
			{{ t('shell.api.connect') }}
		</UiButton>
	</form>
</template>
