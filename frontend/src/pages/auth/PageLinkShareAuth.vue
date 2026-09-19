<script setup lang="ts">
import {ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {LockOpen} from '@lucide/vue'

import {useRedirectToLastVisited} from '@/composables/useRedirectToLastVisited'
import {useTitle} from '@/composables/useTitle'
import {LINK_SHARE_HASH_PREFIX} from '@/constants/linkShareHash'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import PasswordInput from '@/features/auth/PasswordInput.vue'
import {problemCode, problemStatus} from '@/modules/api/problem'
import {useAuthStore} from '@/stores/auth'
import {useBaseStore} from '@/stores/base'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

const PASSWORD_REQUIRED = 13001
const PASSWORD_INVALID = 13002

const {t} = useI18n()
useTitle(() => t('auth.share.title'))

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const baseStore = useBaseStore()
const {getLastVisitedRoute} = useRedirectToLastVisited()

const loading = ref(false)
const needsPassword = ref(false)
const password = ref('')
const errorMessage = ref('')

function openProject(projectId: number) {
	const hash = LINK_SHARE_HASH_PREFIX + route.params.share
	const last = getLastVisitedRoute()
	if (last) {
		return router.push({...last, hash})
	}
	const viewId = new URLSearchParams(window.location.search).get('view')
	if (viewId) {
		return router.push({name: 'project.view', params: {projectId, viewId}, hash})
	}
	return router.push({name: 'project.index', params: {projectId}, hash})
}

async function authenticate() {
	errorMessage.value = ''
	if (authStore.authLinkShare) {
		return
	}
	loading.value = true
	try {
		const share = await authStore.linkShareAuth({
			hash: route.params.share as string,
			password: password.value || undefined,
		})
		baseStore.setLogoVisible(route.query.logoVisible !== 'false')
		await openProject(share.project_id ?? 0)
	} catch (e) {
		const code = problemCode(e)
		const status = problemStatus(e)
		if (code === PASSWORD_REQUIRED) {
			needsPassword.value = true
		} else if (code === PASSWORD_INVALID) {
			needsPassword.value = true
			errorMessage.value = t('auth.share.wrongPassword')
		} else if (status === 403) {
			errorMessage.value = t('auth.share.denied')
		} else if (status === undefined || status >= 500) {
			errorMessage.value = t('auth.share.serverError')
		} else {
			errorMessage.value = t('auth.share.failed')
		}
		// Never log the error body: the request carried the share password.
		console.error('Link share authentication failed', status, code)
	} finally {
		loading.value = false
	}
}

authenticate()
</script>

<template>
	<AuthLayout
		:title="t('auth.share.title')"
		:description="needsPassword ? t('auth.share.passwordDescription') : undefined"
	>
		<div class="grid gap-4">
			<UiAlert
				v-if="errorMessage"
				tone="danger"
			>
				{{ errorMessage }}
			</UiAlert>
			<form
				v-if="needsPassword"
				class="grid gap-4"
				@submit.prevent="authenticate"
			>
				<UiField :label="t('auth.password')">
					<PasswordInput
						v-model="password"
						autocomplete="off"
						autofocus
					/>
				</UiField>
				<UiButton
					type="submit"
					variant="primary"
					size="lg"
					block
					:loading="loading"
					:icon="LockOpen"
				>
					{{ t('auth.share.open') }}
				</UiButton>
			</form>
			<p
				v-else-if="loading"
				class="flex items-center gap-2.5 text-ink-muted"
			>
				<UiSpinner />
				{{ t('auth.share.working') }}
			</p>
		</div>
	</AuthLayout>
</template>
