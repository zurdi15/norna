<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {FolderX, KeyRound, MailCheck, Trash2, Undo2, Users} from '@lucide/vue'

import {useCancelAccountDeletionMutation, useRequestAccountDeletionMutation} from '@/client/queries/accountDeletion'
import CurrentPasswordField from '@/features/settings/data/CurrentPasswordField.vue'
import {usePasswordConfirmation} from '@/features/settings/data/usePasswordConfirmation'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {formatDateLong, formatDateSince} from '@/helpers/time/formatDate'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'

/**
 * Deleting the account takes two steps: a request here, then the link in the email.
 * The account goes three days later, and until then the deletion can be called off here.
 */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()
const configStore = useConfigStore()

const scheduledAt = computed(() => parseDateOrNull(authStore.info?.deletion_scheduled_at))
const {required, password, fieldError, field, take, fail, clear} = usePasswordConfirmation()

const consequences = computed(() => [
	{icon: FolderX, text: t('settingsData.deletion.consequences.projects')},
	{icon: Users, text: t('settingsData.deletion.consequences.shared')},
	{icon: KeyRound, text: t('settingsData.deletion.consequences.rest')},
	{icon: MailCheck, text: t('settingsData.deletion.consequences.confirm')},
])

// The email went out in this visit: say where to look next.
const emailSent = ref(false)
const requestDeletion = useRequestAccountDeletionMutation()
const cancelDeletion = useCancelAccountDeletionMutation()

async function submitRequest() {
	const confirmed = take()
	if (confirmed === null || requestDeletion.isPending.value) {
		return
	}
	try {
		await requestDeletion.mutateAsync(confirmed)
		clear()
		emailSent.value = true
	} catch (cause) {
		fail(cause)
	} finally {
		// Drops the password from the mutation cache.
		requestDeletion.reset()
	}
}

async function submitCancel() {
	const confirmed = take()
	if (confirmed === null || cancelDeletion.isPending.value) {
		return
	}
	try {
		await cancelDeletion.mutateAsync(confirmed)
		clear()
		emailSent.value = false
		await authStore.refreshUserInfo()
	} catch (cause) {
		fail(cause)
	} finally {
		cancelDeletion.reset()
	}
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.deletion')"
		:description="configStore.user_deletion_enabled ? t('settingsData.deletion.description') : undefined"
	>
		<UiEmptyState
			v-if="!configStore.user_deletion_enabled"
			:title="t('settingsData.deletion.disabledTitle')"
			:description="t('settingsData.deletion.disabledDescription')"
			class="py-8"
		/>

		<template v-else-if="scheduledAt">
			<UiAlert tone="danger">
				<p class="font-medium">
					{{ t('settingsData.deletion.scheduledTitle') }}
				</p>
				<p class="mt-0.5">
					{{ t('settingsData.deletion.scheduled', {date: formatDateLong(scheduledAt), relative: formatDateSince(scheduledAt)}) }}
				</p>
			</UiAlert>
			<SettingsSection :title="t('settingsData.deletion.keepTitle')">
				<form
					class="grid gap-4 py-4"
					@submit.prevent="submitCancel"
				>
					<p class="text-sm text-pretty text-ink-muted">
						{{ t('settingsData.deletion.keepDescription') }}
					</p>
					<CurrentPasswordField
						v-if="required"
						ref="field"
						v-model="password"
						:error="fieldError"
						class="md:max-w-sm"
					/>
					<UiButton
						type="submit"
						variant="primary"
						:icon="Undo2"
						:loading="cancelDeletion.isPending.value"
						class="max-md:w-full md:justify-self-start"
					>
						{{ t('settingsData.deletion.keep') }}
					</UiButton>
				</form>
			</SettingsSection>
		</template>

		<template v-else>
			<SettingsSection
				:title="t('settingsData.deletion.title')"
				tone="danger"
			>
				<div class="grid gap-5 py-4">
					<ul
						role="list"
						class="grid gap-3"
					>
						<li
							v-for="item in consequences"
							:key="item.text"
							class="flex gap-3 text-sm text-pretty text-ink-muted"
						>
							<UiIcon
								:icon="item.icon"
								class="mt-0.5 text-ink-faint"
							/>
							<span>{{ item.text }}</span>
						</li>
					</ul>
					<p class="text-sm text-pretty text-ink-muted">
						{{ t('settingsData.deletion.exportFirst') }}
						<RouterLink
							:to="{name: 'user.settings.data-export'}"
							class="font-medium text-accent hover:underline"
						>
							{{ t('settingsData.deletion.exportLink') }}
						</RouterLink>
					</p>
					<form
						class="grid gap-4"
						@submit.prevent="submitRequest"
					>
						<CurrentPasswordField
							v-if="required"
							ref="field"
							v-model="password"
							:error="fieldError"
							class="md:max-w-sm"
						/>
						<UiAlert
							v-if="emailSent"
							tone="info"
						>
							{{ t('settingsData.deletion.emailSent') }}
						</UiAlert>
						<UiButton
							type="submit"
							variant="danger"
							:icon="Trash2"
							:loading="requestDeletion.isPending.value"
							class="max-md:w-full md:justify-self-start"
						>
							{{ t('settingsData.deletion.submit') }}
						</UiButton>
					</form>
				</div>
			</SettingsSection>
		</template>
	</SettingsPage>
</template>
