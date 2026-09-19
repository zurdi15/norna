<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {ExternalLink, KeyRound, Plus, Trash2} from '@lucide/vue'

import {useCreateCaldavTokenMutation, useDeleteCaldavTokenMutation} from '@/client/queries/caldavTokens'
import {useGlobalNow} from '@/composables/useGlobalNow'
import CopyableValue from '@/features/settings/integrations/CopyableValue.vue'
import {formatAgo} from '@/features/settings/integrations/format'
import IntegrationListState from '@/features/settings/integrations/IntegrationListState.vue'
import NewSecretNotice from '@/features/settings/integrations/NewSecretNotice.vue'
import {useCaldavTokens, type ListedCaldavToken} from '@/features/settings/integrations/useIntegrations'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {formatDisplayDate} from '@/helpers/time/formatDate'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import {CALDAV_DOCS} from '@/urls'

/** Calendar and task apps that speak CalDAV: the address to give them and the tokens they sign in with. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()
const configStore = useConfigStore()
const {now} = useGlobalNow()

const username = computed(() => authStore.info?.username ?? '')
const caldavUrl = computed(() => `${configStore.apiBase}/dav/principals/${username.value}/`)
// Accounts from LDAP or OpenID have no password here to sign in with.
const isLocalUser = computed(() => authStore.info?.is_local_user ?? false)

const tokens = useCaldavTokens()
const sorted = computed(() => [...tokens.tokens.value].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '')))

const create = useCreateCaldavTokenMutation()
const remove = useDeleteCaldavTokenMutation()
// The new token, shown this once: nothing else keeps it.
const newToken = ref<string | null>(null)

async function createToken() {
	try {
		newToken.value = (await create.mutateAsync()).token ?? null
	} catch {
		return
	} finally {
		// Drops the cleartext token from the mutation cache.
		create.reset()
	}
}

async function removeToken(token: ListedCaldavToken) {
	const confirmed = await confirm({
		title: t('settingsIntegrations.caldav.deleteTitle'),
		description: t('settingsIntegrations.caldav.deleteDescription'),
		confirmLabel: t('settingsIntegrations.tokens.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate(token.id)
	}
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.caldav')"
		:description="t('settingsIntegrations.caldav.description')"
	>
		<section class="grid gap-4">
			<CopyableValue
				:label="t('settingsIntegrations.caldav.url')"
				:value="caldavUrl"
			/>
			<CopyableValue
				:label="t('settingsIntegrations.username')"
				:value="username"
			/>
			<p class="text-sm text-pretty text-ink-muted">
				{{ isLocalUser ? t('settingsIntegrations.caldav.passwordOrToken') : t('settingsIntegrations.caldav.tokenOnly') }}
			</p>
			<a
				:href="CALDAV_DOCS"
				target="_blank"
				rel="noopener"
				class="inline-flex items-center gap-1 justify-self-start text-sm text-accent hover:underline"
			>
				{{ t('settingsIntegrations.caldav.docs') }}
				<UiIcon
					:icon="ExternalLink"
					size="xs"
				/>
			</a>
		</section>
		<section class="grid gap-1">
			<UiSectionHeading
				:title="t('settingsIntegrations.caldav.tokensTitle')"
				:count="tokens.isSuccess.value ? sorted.length : undefined"
			>
				<template #actions>
					<UiButton
						variant="ghost"
						size="sm"
						:icon="Plus"
						:loading="create.isPending.value"
						class="-me-2 pointer-coarse:h-11"
						@click="createToken"
					>
						{{ t('settingsIntegrations.tokens.new') }}
					</UiButton>
				</template>
			</UiSectionHeading>
			<NewSecretNotice
				v-if="newToken"
				class="my-2"
				:title="t('settingsIntegrations.caldav.createdTitle')"
				:value="newToken"
				@done="newToken = null"
			/>
			<IntegrationListState
				:pending="tokens.isPending.value"
				:error="tokens.isError.value"
				:empty="!sorted.length"
				:empty-title="t('settingsIntegrations.caldav.emptyTitle')"
				:empty-description="isLocalUser ? undefined : t('settingsIntegrations.caldav.tokenOnly')"
				@retry="tokens.refetch()"
			>
				<ul
					role="list"
					class="divide-y divide-line"
				>
					<li
						v-for="token in sorted"
						:key="token.id"
						class="flex items-center gap-3 py-3"
					>
						<span
							class="grid size-5 shrink-0 place-items-center rounded-sm bg-accent-subtle text-accent"
							aria-hidden="true"
						>
							<UiIcon
								:icon="KeyRound"
								size="xs"
							/>
						</span>
						<div class="grid min-w-0 flex-1 gap-0.5">
							<p class="truncate text-base text-ink pointer-coarse:text-md">
								{{ t('settingsIntegrations.caldav.tokenName') }} <span class="font-mono text-sm text-ink-faint">#{{ token.id }}</span>
							</p>
							<time
								v-if="token.created"
								:datetime="token.created"
								:title="formatDisplayDate(token.created)"
								class="font-mono text-2xs text-ink-faint"
							>{{ t('settingsIntegrations.tokens.createdAgo', {ago: formatAgo(token.created, now)}) }}</time>
						</div>
						<UiIconButton
							:icon="Trash2"
							:label="t('settingsIntegrations.caldav.deleteNamed', {id: token.id})"
							class="-me-2 hover:text-danger"
							@click="removeToken(token)"
						/>
					</li>
				</ul>
			</IntegrationListState>
			<p class="pt-2 text-xs text-pretty text-ink-faint">
				{{ t('settingsIntegrations.caldav.apiTokenHint') }}
				<RouterLink
					:to="{name: 'user.settings.apiTokens', query: {title: t('settings.nav.caldav'), scopes: 'caldav:access'}}"
					class="text-accent hover:underline"
				>
					{{ t('settingsIntegrations.caldav.apiTokenLink') }}
				</RouterLink>
			</p>
		</section>
	</SettingsPage>
</template>
