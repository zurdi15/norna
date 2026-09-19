<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import type {ApiToken} from '@/client/generated'
import ApiTokenDialog from '@/features/settings/integrations/ApiTokenDialog.vue'
import ApiTokenList from '@/features/settings/integrations/ApiTokenList.vue'
import CopyableValue from '@/features/settings/integrations/CopyableValue.vue'
import IntegrationListState from '@/features/settings/integrations/IntegrationListState.vue'
import NewSecretNotice from '@/features/settings/integrations/NewSecretNotice.vue'
import {useApiTokens, useTokenRoutes} from '@/features/settings/integrations/useIntegrations'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiButton from '@/ui/UiButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

/** The notifications as an Atom feed, for feed readers that sign in with the username and a feeds token. */
defineOptions({inheritAttrs: false})

// A feed token can read the feed and nothing else.
const FEED_PERMISSIONS = {feeds: ['access']}

const {t} = useI18n()
const authStore = useAuthStore()
const configStore = useConfigStore()

const username = computed(() => authStore.info?.username ?? '')
const feedUrl = computed(() => `${configStore.apiBase}/feeds/notifications.atom`)

const tokens = useApiTokens()
const {routes} = useTokenRoutes()
// Any token that may read the feed, including broader ones made on the API tokens page.
const feedTokens = computed(() => tokens.tokens.value.filter(token => token.permissions?.feeds?.includes('access')))

const dialogOpen = ref(false)
// The new token, shown this once: nothing else keeps it.
const created = ref<ApiToken | null>(null)
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.feeds')"
		:description="t('settingsIntegrations.feeds.description')"
	>
		<section class="grid gap-4">
			<CopyableValue
				:label="t('settingsIntegrations.feeds.url')"
				:value="feedUrl"
			/>
			<CopyableValue
				:label="t('settingsIntegrations.username')"
				:value="username"
			/>
			<p class="text-sm text-pretty text-ink-muted">
				{{ t('settingsIntegrations.feeds.howTo') }}
			</p>
		</section>
		<section class="grid gap-1">
			<UiSectionHeading
				:title="t('settingsIntegrations.feeds.tokensTitle')"
				:count="tokens.isSuccess.value ? feedTokens.length : undefined"
			>
				<template #actions>
					<UiButton
						variant="ghost"
						size="sm"
						:icon="Plus"
						class="-me-2 pointer-coarse:h-11"
						@click="dialogOpen = true"
					>
						{{ t('settingsIntegrations.tokens.new') }}
					</UiButton>
				</template>
			</UiSectionHeading>
			<NewSecretNotice
				v-if="created?.token"
				class="my-2"
				:title="t('settingsIntegrations.tokens.createdTitle', {title: created.title})"
				:value="created.token"
				@done="created = null"
			/>
			<IntegrationListState
				:pending="tokens.isPending.value"
				:error="tokens.isError.value"
				:empty="!feedTokens.length"
				:empty-title="t('settingsIntegrations.feeds.emptyTitle')"
				:empty-description="t('settingsIntegrations.feeds.emptyDescription')"
				@retry="tokens.refetch()"
			>
				<ApiTokenList
					:tokens="feedTokens"
					:routes="routes"
				/>
			</IntegrationListState>
		</section>
		<ApiTokenDialog
			v-model:open="dialogOpen"
			:title="t('settingsIntegrations.feeds.newToken')"
			:routes="FEED_PERMISSIONS"
			:locked="FEED_PERMISSIONS"
			:presets="[]"
			:initial-title="t('settingsIntegrations.feeds.tokenTitle')"
			@created="token => created = token"
		/>
	</SettingsPage>
</template>
