<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute, useRouter} from 'vue-router'
import {ExternalLink, Plus} from '@lucide/vue'

import type {ApiToken} from '@/client/generated'
import type {TokenPermissions} from '@/client/queries/apiTokens'
import {useGlobalNow} from '@/composables/useGlobalNow'
import ApiTokenDialog from '@/features/settings/integrations/ApiTokenDialog.vue'
import ApiTokenList from '@/features/settings/integrations/ApiTokenList.vue'
import {hasExpired} from '@/features/settings/integrations/format'
import IntegrationListState from '@/features/settings/integrations/IntegrationListState.vue'
import NewSecretNotice from '@/features/settings/integrations/NewSecretNotice.vue'
import {parseScopes} from '@/features/settings/integrations/tokenPermissions'
import {useApiTokens, useTokenRoutes} from '@/features/settings/integrations/useIntegrations'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {apiV2Url} from '@/helpers/apiUrl'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

/** Tokens that let scripts and other apps use the API without the account's password. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const route = useRoute()
const router = useRouter()
const {now} = useGlobalNow()

const tokens = useApiTokens()
const {routes} = useTokenRoutes()

// Working tokens first, the newest on top.
const sorted = computed(() => [...tokens.tokens.value].sort((a, b) =>
	Number(hasExpired(a.expires_at, now.value)) - Number(hasExpired(b.expires_at, now.value))
	|| (b.created ?? '').localeCompare(a.created ?? '')))

const docsUrl = apiV2Url('docs')

const dialogOpen = ref(false)
const initialTitle = ref<string>()
const initialPermissions = ref<TokenPermissions>()
// The new token, shown this once: nothing else keeps it.
const created = ref<ApiToken | null>(null)

function queryValue(value: unknown): string | undefined {
	const single = Array.isArray(value) ? value[0] : value
	return typeof single === 'string' && single !== '' ? single : undefined
}

// Other pages link here to fill the form in, e.g. ?title=Feed&scopes=feeds:access
watch(() => [queryValue(route.query.title), queryValue(route.query.scopes)], ([title, scopes]) => {
	if (title === undefined && scopes === undefined) {
		return
	}
	initialTitle.value = title
	initialPermissions.value = parseScopes(scopes ?? '')
	dialogOpen.value = true
	router.replace({query: {}})
}, {immediate: true})

function startCreating() {
	initialTitle.value = undefined
	initialPermissions.value = undefined
	dialogOpen.value = true
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.apiTokens')"
		:description="t('settingsIntegrations.apiTokens.description')"
	>
		<template #actions>
			<UiButton
				variant="primary"
				size="sm"
				:icon="Plus"
				@click="startCreating"
			>
				{{ t('settingsIntegrations.tokens.new') }}
			</UiButton>
		</template>
		<NewSecretNotice
			v-if="created?.token"
			:title="t('settingsIntegrations.tokens.createdTitle', {title: created.title})"
			:value="created.token"
			@done="created = null"
		/>
		<section class="grid gap-1">
			<UiSectionHeading
				:title="t('settingsIntegrations.apiTokens.listTitle')"
				:count="tokens.isSuccess.value ? sorted.length : undefined"
			/>
			<IntegrationListState
				:pending="tokens.isPending.value"
				:error="tokens.isError.value"
				:empty="!sorted.length"
				:empty-title="t('settingsIntegrations.apiTokens.emptyTitle')"
				:empty-description="t('settingsIntegrations.apiTokens.emptyDescription')"
				@retry="tokens.refetch()"
			>
				<ApiTokenList
					:tokens="sorted"
					:routes="routes"
				/>
			</IntegrationListState>
		</section>
		<a
			:href="docsUrl"
			target="_blank"
			rel="noopener"
			class="inline-flex items-center gap-1 justify-self-start text-sm text-accent hover:underline"
		>
			{{ t('settingsIntegrations.apiTokens.docs') }}
			<UiIcon
				:icon="ExternalLink"
				size="xs"
			/>
		</a>
		<ApiTokenDialog
			v-model:open="dialogOpen"
			:initial-title="initialTitle"
			:initial-permissions="initialPermissions"
			@created="token => created = token"
		/>
	</SettingsPage>
</template>
