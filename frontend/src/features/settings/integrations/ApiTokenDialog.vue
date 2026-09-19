<script setup lang="ts">
import {computed, useId} from 'vue'
import {useI18n} from 'vue-i18n'

import type {ApiToken} from '@/client/generated'
import {useCreateApiTokenMutation, type ApiTokenDraft, type TokenPermissions} from '@/client/queries/apiTokens'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'

import ApiTokenForm from './ApiTokenForm.vue'
import {DEFAULT_PRESET_GROUPS, type TokenPreset} from './tokenPermissions'
import {useTokenRoutes} from './useIntegrations'

/**
 * Creates an API token (for a bot when `ownerId` is set). The cleartext token goes to
 * the `created` listener, the only one that ever sees it.
 */
const props = withDefaults(defineProps<{
	title?: string
	ownerId?: number
	// What the token can be scoped to; every API route when left out.
	routes?: TokenPermissions
	// The default quick picks when left out; [] for none.
	presets?: TokenPreset[]
	locked?: TokenPermissions
	initialTitle?: string
	initialPermissions?: TokenPermissions
}>(), {
	title: undefined,
	ownerId: undefined,
	routes: undefined,
	presets: undefined,
	locked: undefined,
	initialTitle: undefined,
	initialPermissions: undefined,
})

const emit = defineEmits<{
	created: [token: ApiToken]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const formId = useId()

const serverRoutes = useTokenRoutes(() => open.value && !props.routes)
const routes = computed(() => props.routes ?? serverRoutes.routes.value)

const defaultPresets = computed<TokenPreset[]>(() => Object.entries(DEFAULT_PRESET_GROUPS).map(([id, groups]) => ({
	id,
	groups,
	label: t(`settingsIntegrations.tokens.presetNames.${id}`),
})))

const create = useCreateApiTokenMutation()

async function submit(draft: Omit<ApiTokenDraft, 'ownerId'>) {
	let token: ApiToken
	try {
		token = await create.mutateAsync({...draft, ownerId: props.ownerId})
	} catch {
		return
	} finally {
		// Drops the cleartext token from the mutation cache.
		create.reset()
	}
	open.value = false
	emit('created', token)
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="title ?? t('settingsIntegrations.tokens.new')"
		size="lg"
	>
		<ApiTokenForm
			:form-id="formId"
			:routes="routes"
			:routes-loading="!props.routes && serverRoutes.isPending.value"
			:locked="locked"
			:presets="presets ?? defaultPresets"
			:initial-title="initialTitle"
			:initial-permissions="initialPermissions"
			@submit="submit"
		/>
		<template #footer="{close}">
			<UiButton
				variant="ghost"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				:form="formId"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('settingsIntegrations.tokens.create') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
