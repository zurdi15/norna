<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useLocalStorage} from '@vueuse/core'
import {ExternalLink} from '@lucide/vue'

import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSelect from '@/ui/UiSelect.vue'
import {MCP_HELP} from '@/urls'

import CopyableValue from './CopyableValue.vue'

/**
 * How to connect a new MCP token, step by step, for the client the user picks. Only
 * the choice of client is remembered, never the token.
 */
const props = defineProps<{
	endpoint: string
	token: string
}>()

type ClientId = 'claudeCode' | 'codex' | 'claudeDesktop' | 'mistral' | 'chatgpt' | 'other'
type Step = {key: string, value?: string, valueLabel?: string}

// The name the server gets in each client, and the variable Codex reads the token from.
const SERVER_NAME = 'norna'
const TOKEN_VARIABLE = 'NORNA_MCP_TOKEN'

const {t} = useI18n()
const client = useLocalStorage<ClientId | ''>('mcp-client', '')

const clients = computed<{value: ClientId, label: string, helpUrl: string}[]>(() => [
	{value: 'claudeCode', label: 'Claude Code', helpUrl: 'https://code.claude.com/docs/en/mcp'},
	{value: 'codex', label: 'Codex', helpUrl: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli'},
	{value: 'claudeDesktop', label: 'Claude Desktop / claude.ai', helpUrl: 'https://claude.com/docs/connectors/custom/remote-mcp'},
	{value: 'mistral', label: 'Mistral Vibe', helpUrl: 'https://docs.mistral.ai/vibe/work/connectors/mcp-connectors'},
	{value: 'chatgpt', label: 'ChatGPT', helpUrl: 'https://developers.openai.com/api/docs/guides/developer-mode'},
	{value: 'other', label: t('settingsIntegrations.mcp.clients.other.title'), helpUrl: MCP_HELP},
])
const selected = computed(() => clients.value.find(({value}) => value === client.value))
const selection = computed({
	get: () => selected.value?.value,
	set: (value: ClientId | undefined) => client.value = value ?? '',
})

function shellQuote(value: string) {
	return `'${value.replaceAll('\'', '\'\\\'\'')}'`
}

const steps = computed<Step[]>(() => {
	const {endpoint, token} = props
	const label = (key: string) => t(`settingsIntegrations.mcp.values.${key}`)
	switch (client.value) {
		case 'claudeCode': return [
			{key: 'command', valueLabel: label('command'), value: `claude mcp add --transport http ${SERVER_NAME} ${shellQuote(endpoint)} --header ${shellQuote(`Authorization: Bearer ${token}`)}`},
			{key: 'verify'},
		]
		case 'codex': return [
			{key: 'environment', valueLabel: label('environment'), value: `export ${TOKEN_VARIABLE}=${shellQuote(token)}`},
			{key: 'command', valueLabel: label('command'), value: `codex mcp add ${SERVER_NAME} --url ${shellQuote(endpoint)} --bearer-token-env-var ${TOKEN_VARIABLE}`},
			{key: 'config', valueLabel: label('config'), value: `[mcp_servers.${SERVER_NAME}]\nurl = ${JSON.stringify(endpoint)}\nbearer_token_env_var = "${TOKEN_VARIABLE}"`},
			{key: 'note'},
		]
		case 'claudeDesktop': return [
			{key: 'open'},
			{key: 'url', valueLabel: label('url'), value: endpoint},
			{key: 'auth'},
			{key: 'header', valueLabel: label('header'), value: `Bearer ${token}`},
			{key: 'beta'},
		]
		case 'mistral': return [
			{key: 'open'},
			{key: 'url', valueLabel: label('url'), value: endpoint},
			{key: 'token', valueLabel: label('token'), value: token},
		]
		case 'other': return [
			{key: 'url', valueLabel: label('url'), value: endpoint},
			{key: 'header', valueLabel: label('header'), value: `Authorization: Bearer ${token}`},
		]
		default: return []
	}
})
</script>

<template>
	<div class="grid gap-4 border-t border-success/35 pt-4">
		<UiField :label="t('settingsIntegrations.mcp.client')">
			<UiSelect
				v-model="selection"
				:items="clients"
				:placeholder="t('settingsIntegrations.mcp.chooseClient')"
				class="sm:w-72"
			/>
		</UiField>
		<p
			v-if="client === 'chatgpt'"
			class="text-sm text-pretty text-ink-muted"
		>
			{{ t('settingsIntegrations.mcp.clients.chatgpt.unavailable') }}
		</p>
		<ol
			v-else-if="steps.length"
			class="grid gap-4"
		>
			<li
				v-for="(step, index) in steps"
				:key="step.key"
				class="flex gap-3"
			>
				<span
					class="
						grid size-5 shrink-0 place-items-center rounded-full border border-line-strong font-mono
						text-2xs text-ink-muted
					"
					aria-hidden="true"
				>{{ index + 1 }}</span>
				<div class="grid min-w-0 flex-1 gap-2">
					<p class="text-sm text-pretty text-ink">
						{{ t(`settingsIntegrations.mcp.clients.${client}.${step.key}`) }}
					</p>
					<CopyableValue
						v-if="step.value"
						:value="step.value"
						:label="step.valueLabel ?? ''"
						hide-label
						code
					/>
				</div>
			</li>
		</ol>
		<a
			v-if="selected"
			:href="selected.helpUrl"
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-1 justify-self-start text-sm text-accent hover:underline"
		>
			{{ selected.value === 'other' ? t('settingsIntegrations.mcp.docs') : t('settingsIntegrations.mcp.clientHelp', {client: selected.label}) }}
			<UiIcon
				:icon="ExternalLink"
				size="xs"
			/>
		</a>
	</div>
</template>
