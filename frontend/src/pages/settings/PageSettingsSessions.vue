<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {LogOut} from '@lucide/vue'

import {
	sessionsQuery,
	useRevokeSessionMutation,
	useRevokeSessionsMutation,
	type UserSession,
} from '@/client/queries/sessions'
import SessionRow from '@/features/settings/account/SessionRow.vue'
import {deviceName} from '@/features/settings/account/userAgent'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {getToken} from '@/helpers/auth'
import {getErrorText} from '@/message'
import {identityFromToken} from '@/modules/session/identity'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Where the account is signed in, with a way to sign out any other device, or all of them. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()

const sessions = useQuery(sessionsQuery())
const revoke = useRevokeSessionMutation()
const revokeMany = useRevokeSessionsMutation()

// The token names its session; the store's copy can lag after signing in again.
const currentId = identityFromToken(getToken())?.sid ?? authStore.currentSessionId

const current = computed(() => sessions.data.value?.find(session => session.id === currentId))
const others = computed(() => sessions.data.value?.filter(session => session.id !== currentId) ?? [])

async function revokeOne(session: UserSession) {
	const confirmed = await confirm({
		title: t('settingsAccount.sessions.revokeTitle'),
		description: t('settingsAccount.sessions.revokeDescription', {device: deviceName(session.device_info, t)}),
		confirmLabel: t('settingsAccount.sessions.revoke'),
		tone: 'danger',
	})
	if (confirmed) {
		revoke.mutate(session.id)
	}
}

async function revokeOthers() {
	const ids = others.value.map(session => session.id)
	const confirmed = await confirm({
		title: t('settingsAccount.sessions.revokeOthersTitle'),
		description: t('settingsAccount.sessions.revokeOthersDescription', ids.length),
		confirmLabel: t('settingsAccount.sessions.revokeOthers'),
		tone: 'danger',
	})
	if (confirmed) {
		revokeMany.mutate(ids)
	}
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.sessions')"
		:description="t('settingsAccount.sessions.description')"
	>
		<div
			v-if="sessions.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-4 w-32" />
			<UiSkeleton class="h-14" />
			<UiSkeleton class="h-14" />
		</div>
		<UiAlert
			v-else-if="sessions.isError.value"
			tone="danger"
		>
			{{ getErrorText(sessions.error.value) }}
		</UiAlert>
		<template v-else>
			<SettingsSection :title="t('settingsAccount.sessions.listTitle')">
				<template
					v-if="others.length > 1"
					#actions
				>
					<UiButton
						variant="ghost"
						size="sm"
						:icon="LogOut"
						:loading="revokeMany.isPending.value"
						class="-me-2 text-danger hover:text-danger pointer-coarse:h-11"
						@click="revokeOthers"
					>
						{{ t('settingsAccount.sessions.revokeOthers') }}
					</UiButton>
				</template>
				<SessionRow
					v-if="current"
					:session="current"
					current
				/>
				<SessionRow
					v-for="session in others"
					:key="session.id"
					:session="session"
					:revoking="revoke.isPending.value && revoke.variables.value === session.id"
					@revoke="revokeOne(session)"
				/>
				<p
					v-if="!others.length"
					class="py-4 text-sm text-ink-muted"
				>
					{{ t('settingsAccount.sessions.noOthers') }}
				</p>
			</SettingsSection>
		</template>
	</SettingsPage>
</template>
