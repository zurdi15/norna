<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Ellipsis, Pencil, Plus, Power, PowerOff, Trash2} from '@lucide/vue'

import type {ApiToken} from '@/client/generated'
import {BOT_STATUS, useDeleteBotMutation, useUpdateBotMutation} from '@/client/queries/bots'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {confirm} from '@/ui/confirm'
import type {UiMenuEntry} from '@/ui/menu'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import ApiTokenDialog from './ApiTokenDialog.vue'
import ApiTokenList from './ApiTokenList.vue'
import LoadFailedAlert from './LoadFailedAlert.vue'
import NewSecretNotice from './NewSecretNotice.vue'
import {useApiTokens, useTokenRoutes, type ListedBot} from './useIntegrations'

/** One bot: who it is, whether it may sign in, and the API tokens it signs in with. */
const props = defineProps<{
	bot: ListedBot
}>()

const emit = defineEmits<{
	edit: []
}>()

const {t} = useI18n()
const update = useUpdateBotMutation()
const remove = useDeleteBotMutation()
const tokens = useApiTokens(() => props.bot.id)
const {routes} = useTokenRoutes()

const disabled = computed(() => props.bot.status === BOT_STATUS.disabled)
const tokenDialogOpen = ref(false)
// The new token, shown this once: nothing else keeps it.
const created = ref<ApiToken | null>(null)

function setStatus(status: number) {
	update.mutate({id: props.bot.id, username: props.bot.username, name: props.bot.name ?? '', status})
}

async function removeBot() {
	const confirmed = await confirm({
		title: t('settingsIntegrations.bots.deleteTitle', {username: props.bot.username}),
		description: t('settingsIntegrations.bots.deleteDescription'),
		confirmLabel: t('settingsIntegrations.bots.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate(props.bot.id)
	}
}

const menu = computed<UiMenuEntry[]>(() => [
	{label: t('settingsIntegrations.bots.edit'), icon: Pencil, onSelect: () => emit('edit')},
	disabled.value
		? {label: t('settingsIntegrations.bots.enable'), icon: Power, onSelect: () => setStatus(BOT_STATUS.active)}
		: {label: t('settingsIntegrations.bots.disable'), icon: PowerOff, onSelect: () => setStatus(BOT_STATUS.disabled)},
	{type: 'separator'},
	{label: t('settingsIntegrations.bots.delete'), icon: Trash2, tone: 'danger', onSelect: removeBot},
])
</script>

<template>
	<li class="grid gap-3 rounded-lg border border-line bg-surface p-4">
		<div class="flex items-center gap-3">
			<UserAvatar
				:username="bot.username"
				:name="bot.name || bot.username"
				size="lg"
				:class="disabled && 'opacity-60'"
			/>
			<div class="min-w-0 flex-1">
				<p
					class="flex min-w-0 items-center gap-2 text-base font-medium pointer-coarse:text-md"
					:class="disabled ? 'text-ink-muted' : 'text-ink'"
				>
					<span class="truncate">{{ bot.name || bot.username }}</span>
					<UiChip
						v-if="disabled"
						size="sm"
						tone="warning"
						class="shrink-0"
					>
						{{ t('settingsIntegrations.bots.disabled') }}
					</UiChip>
				</p>
				<p class="truncate font-mono text-xs text-ink-faint">
					{{ bot.username }}
				</p>
			</div>
			<UiMenu
				:items="menu"
				:title="bot.username"
			>
				<template #trigger>
					<UiIconButton
						:icon="Ellipsis"
						:label="t('settingsIntegrations.bots.actionsFor', {username: bot.username})"
						class="-me-2"
					/>
				</template>
			</UiMenu>
		</div>
		<div class="grid gap-1 border-t border-line pt-2">
			<div class="flex items-center gap-2">
				<h3 class="flex-1 caption">
					{{ t('settingsIntegrations.bots.tokensTitle') }}
				</h3>
				<UiButton
					variant="ghost"
					size="sm"
					:icon="Plus"
					class="-me-2 pointer-coarse:h-10"
					@click="tokenDialogOpen = true"
				>
					{{ t('settingsIntegrations.tokens.new') }}
				</UiButton>
			</div>
			<NewSecretNotice
				v-if="created?.token"
				class="my-2"
				:title="t('settingsIntegrations.tokens.createdTitle', {title: created.title})"
				:value="created.token"
				@done="created = null"
			/>
			<UiSkeleton
				v-if="tokens.isPending.value"
				class="my-2 h-10"
			/>
			<LoadFailedAlert
				v-else-if="tokens.isError.value"
				class="my-2"
				@retry="tokens.refetch()"
			/>
			<p
				v-else-if="!tokens.tokens.value.length"
				class="pb-1 text-sm text-ink-muted"
			>
				{{ t('settingsIntegrations.bots.noTokens') }}
			</p>
			<ApiTokenList
				v-else
				:tokens="tokens.tokens.value"
				:routes="routes"
				:owner-id="bot.id"
			/>
		</div>
		<ApiTokenDialog
			v-model:open="tokenDialogOpen"
			:title="t('settingsIntegrations.bots.newToken', {username: bot.username})"
			:owner-id="bot.id"
			@created="token => created = token"
		/>
	</li>
</template>
