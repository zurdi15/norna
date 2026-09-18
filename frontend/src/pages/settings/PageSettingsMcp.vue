<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {ExternalLink, Plus} from '@lucide/vue'

import type {ApiToken} from '@/client/generated'
import ApiTokenDialog from '@/features/settings/integrations/ApiTokenDialog.vue'
import ApiTokenList from '@/features/settings/integrations/ApiTokenList.vue'
import CopyableValue from '@/features/settings/integrations/CopyableValue.vue'
import IntegrationListState from '@/features/settings/integrations/IntegrationListState.vue'
import LoadFailedAlert from '@/features/settings/integrations/LoadFailedAlert.vue'
import McpClientGuide from '@/features/settings/integrations/McpClientGuide.vue'
import NewSecretNotice from '@/features/settings/integrations/NewSecretNotice.vue'
import {expandPreset, type TokenPreset} from '@/features/settings/integrations/tokenPermissions'
import {useApiTokens, useMcpSettings, useTokenRoutes} from '@/features/settings/integrations/useIntegrations'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import {MCP_HELP} from '@/urls'

/** Connects AI assistants through the Model Context Protocol: the endpoint and the tokens they use. */
defineOptions({inheritAttrs: false})

// Every MCP token has this; the tools add the rest.
const MCP_ACCESS = {mcp: ['access']}

const {t} = useI18n()

const mcp = useMcpSettings()
const settings = computed(() => mcp.settings.value)
const tokens = useApiTokens()
const {routes} = useTokenRoutes()
const mcpTokens = computed(() => tokens.tokens.value.filter(token => token.permissions?.mcp?.includes('access')))

const presets = computed<TokenPreset[]>(() => settings.value ? [
	{id: 'readOnly', label: t('settingsIntegrations.tokens.presetNames.readOnly'), groups: settings.value.presets.readOnly},
	{id: 'typed', label: t('settingsIntegrations.mcp.typedPreset'), groups: settings.value.presets.typed},
	{id: 'fullAccess', label: t('settingsIntegrations.tokens.presetNames.fullAccess'), groups: settings.value.presets.full},
] : [])
// New tokens start with what the built-in tools use.
const initialPermissions = computed(() => settings.value ? expandPreset(settings.value.presets.typed, settings.value.routes) : {})

const dialogOpen = ref(false)
// The new token, shown this once with the steps to connect it: nothing else keeps it.
const created = ref<ApiToken | null>(null)
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.mcp')"
		:description="t('settingsIntegrations.mcp.description')"
	>
		<section class="grid gap-4">
			<div
				v-if="mcp.isPending.value"
				class="grid gap-1.5"
				aria-hidden="true"
			>
				<UiSkeleton class="h-4 w-24" />
				<UiSkeleton class="h-10" />
			</div>
			<LoadFailedAlert
				v-else-if="mcp.isError.value"
				@retry="mcp.refetch()"
			/>
			<CopyableValue
				v-else-if="settings"
				:label="t('settingsIntegrations.mcp.endpoint')"
				:value="settings.endpoint"
			/>
			<a
				:href="MCP_HELP"
				target="_blank"
				rel="noopener"
				class="inline-flex items-center gap-1 justify-self-start text-sm text-accent hover:underline"
			>
				{{ t('settingsIntegrations.mcp.docs') }}
				<UiIcon
					:icon="ExternalLink"
					size="xs"
				/>
			</a>
		</section>
		<section class="grid gap-1">
			<UiSectionHeading
				:title="t('settingsIntegrations.mcp.tokensTitle')"
				:count="tokens.isSuccess.value ? mcpTokens.length : undefined"
			>
				<template
					v-if="settings"
					#actions
				>
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
				v-if="created?.token && settings"
				class="my-2"
				:title="t('settingsIntegrations.mcp.createdTitle')"
				:value="created.token"
				@done="created = null"
			>
				<McpClientGuide
					:endpoint="settings.endpoint"
					:token="created.token"
				/>
			</NewSecretNotice>
			<IntegrationListState
				:pending="tokens.isPending.value"
				:error="tokens.isError.value"
				:empty="!mcpTokens.length"
				:empty-title="t('settingsIntegrations.mcp.emptyTitle')"
				:empty-description="t('settingsIntegrations.mcp.emptyDescription')"
				@retry="tokens.refetch()"
			>
				<ApiTokenList
					:tokens="mcpTokens"
					:routes="routes"
				/>
			</IntegrationListState>
			<RouterLink
				:to="{name: 'user.settings.apiTokens'}"
				class="justify-self-start pt-2 text-sm text-accent hover:underline"
			>
				{{ t('settingsIntegrations.mcp.allTokens') }}
			</RouterLink>
		</section>
		<ApiTokenDialog
			v-if="settings"
			v-model:open="dialogOpen"
			:title="t('settingsIntegrations.mcp.newToken')"
			:routes="settings.routes"
			:presets="presets"
			:locked="MCP_ACCESS"
			initial-title="MCP"
			:initial-permissions="initialPermissions"
			@created="token => created = token"
		/>
	</SettingsPage>
</template>
