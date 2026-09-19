<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import {useDeleteApiTokenMutation, type TokenPermissions} from '@/client/queries/apiTokens'
import {confirm} from '@/ui/confirm'

import ApiTokenRow from './ApiTokenRow.vue'
import type {ListedApiToken} from './useIntegrations'

/** API tokens with a way to revoke each; a bot's when `ownerId` is set. */
const props = withDefaults(defineProps<{
	tokens: ListedApiToken[]
	routes?: TokenPermissions
	ownerId?: number
}>(), {
	routes: undefined,
	ownerId: undefined,
})

const {t} = useI18n()
const remove = useDeleteApiTokenMutation()

async function removeToken(token: ListedApiToken) {
	const confirmed = await confirm({
		title: t('settingsIntegrations.tokens.deleteTitle'),
		description: t('settingsIntegrations.tokens.deleteDescription', {title: token.title}),
		confirmLabel: t('settingsIntegrations.tokens.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({id: token.id, ownerId: props.ownerId})
	}
}
</script>

<template>
	<ul
		role="list"
		class="divide-y divide-line"
	>
		<ApiTokenRow
			v-for="token in tokens"
			:key="token.id"
			:token="token"
			:routes="routes"
			@remove="removeToken(token)"
		/>
	</ul>
</template>
