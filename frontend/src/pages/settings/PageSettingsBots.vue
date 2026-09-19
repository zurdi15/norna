<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import BotDialog from '@/features/settings/integrations/BotDialog.vue'
import BotItem from '@/features/settings/integrations/BotItem.vue'
import IntegrationListState from '@/features/settings/integrations/IntegrationListState.vue'
import {useBots, type ListedBot} from '@/features/settings/integrations/useIntegrations'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import UiButton from '@/ui/UiButton.vue'

/** Bot users the account owns: they join projects and take tasks, and sign in only with API tokens. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const {bots, isPending, isError, refetch} = useBots()
const sorted = computed(() => [...bots.value].sort((a, b) => a.username.localeCompare(b.username)))

const dialogOpen = ref(false)
// The bot being edited; none while creating one.
const editing = ref<ListedBot>()

function startCreating() {
	editing.value = undefined
	dialogOpen.value = true
}

function startEditing(bot: ListedBot) {
	editing.value = bot
	dialogOpen.value = true
}
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.bots')"
		:description="t('settingsIntegrations.bots.description')"
	>
		<template #actions>
			<UiButton
				variant="primary"
				size="sm"
				:icon="Plus"
				@click="startCreating"
			>
				{{ t('settingsIntegrations.bots.new') }}
			</UiButton>
		</template>
		<IntegrationListState
			:pending="isPending"
			:error="isError"
			:empty="!sorted.length"
			:empty-title="t('settingsIntegrations.bots.emptyTitle')"
			:empty-description="t('settingsIntegrations.bots.emptyDescription')"
			@retry="refetch()"
		>
			<ul
				role="list"
				class="grid gap-4"
			>
				<BotItem
					v-for="bot in sorted"
					:key="bot.id"
					:bot="bot"
					@edit="startEditing(bot)"
				/>
			</ul>
		</IntegrationListState>
		<BotDialog
			v-model:open="dialogOpen"
			:bot="editing"
		/>
	</SettingsPage>
</template>
