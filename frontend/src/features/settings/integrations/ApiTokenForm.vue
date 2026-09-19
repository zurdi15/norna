<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import type {ApiTokenDraft, TokenPermissions} from '@/client/queries/apiTokens'
import {addDays} from '@/helpers/time/dateMath'
import UiChip from '@/ui/UiChip.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

import {formatDay, neverExpires} from './format'
import {countPermissions, mergePermissions, restrictToRoutes, type TokenPreset} from './tokenPermissions'
import TokenExpiryPicker from './TokenExpiryPicker.vue'
import TokenPermissionsPicker from './TokenPermissionsPicker.vue'

/** A new API token: a name to recognise it by, when it expires and what it may do. */
const props = withDefaults(defineProps<{
	formId: string
	routes: TokenPermissions
	routesLoading?: boolean
	// Always granted and can't be unticked, e.g. mcp.access for an MCP token.
	locked?: TokenPermissions
	presets?: TokenPreset[]
	initialTitle?: string
	initialPermissions?: TokenPermissions
}>(), {
	routesLoading: false,
	locked: () => ({}),
	presets: () => [],
	initialTitle: '',
	initialPermissions: () => ({}),
})

const emit = defineEmits<{
	submit: [draft: Omit<ApiTokenDraft, 'ownerId'>]
}>()

const DEFAULT_EXPIRY_DAYS = 30

const {t, locale} = useI18n()
const expiryHintId = useId()
const permissionsHintId = useId()

// eslint-disable-next-line vue/no-setup-props-reactivity-loss -- seeded once: the form opens fresh each time.
const title = ref(props.initialTitle)
const expiresAt = ref(addDays(new Date(), DEFAULT_EXPIRY_DAYS))
const permissions = ref<TokenPermissions>({})

// The routes may arrive after the form opens: the initial picks apply once they do.
let seeded = false
watch(() => props.routes, routes => {
	if (!seeded && Object.keys(routes).length > 0) {
		seeded = true
		permissions.value = restrictToRoutes(mergePermissions(props.initialPermissions, props.locked), routes)
	}
}, {immediate: true})

// Everything on offer is locked (a feed token): there is nothing to pick, only to show.
const fixed = computed(() => {
	const groups = Object.entries(props.routes)
	return groups.length > 0 && groups.every(([group, available]) => available.every(permission => props.locked[group]?.includes(permission)))
})
const fixedScopes = computed(() => Object.entries(permissions.value).flatMap(([group, list]) => list.map(permission => `${group}.${permission}`)))

const touched = ref(false)
const titleError = computed(() => touched.value && title.value.trim() === ''
	? t('settingsIntegrations.tokens.titleRequired')
	: undefined)
const expiryError = computed(() => touched.value && expiresAt.value.getTime() <= Date.now()
	? t('settingsIntegrations.tokens.expiry.invalid')
	: undefined)
const permissionsError = computed(() => touched.value && countPermissions(permissions.value) === 0
	? t('settingsIntegrations.tokens.permissionsRequired')
	: undefined)

function submit() {
	touched.value = true
	if (titleError.value || expiryError.value || permissionsError.value) {
		return
	}
	emit('submit', {title: title.value.trim(), expiresAt: expiresAt.value, permissions: permissions.value})
}
</script>

<template>
	<form
		:id="formId"
		class="grid gap-6"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('settingsIntegrations.tokens.name')"
			:hint="t('settingsIntegrations.tokens.nameHint')"
			:error="titleError"
			required
		>
			<UiInput
				v-model="title"
				autocomplete="off"
				maxlength="250"
				:placeholder="t('settingsIntegrations.tokens.namePlaceholder')"
			/>
		</UiField>
		<fieldset class="grid gap-1.5">
			<legend class="mb-1.5 text-sm font-medium text-ink">
				{{ t('settingsIntegrations.tokens.expiry.label') }}
			</legend>
			<TokenExpiryPicker
				v-model="expiresAt"
				:invalid="Boolean(expiryError)"
				:described-by="expiryHintId"
			/>
			<p
				:id="expiryHintId"
				class="text-xs"
				:class="expiryError ? 'text-danger' : 'text-ink-faint'"
			>
				{{ expiryError ?? (neverExpires(expiresAt)
					? t('settingsIntegrations.tokens.expiry.neverHint')
					: t('settingsIntegrations.tokens.expiry.on', {date: formatDay(expiresAt, locale)})) }}
			</p>
		</fieldset>
		<fieldset
			class="grid gap-3"
			:aria-describedby="permissionsHintId"
		>
			<legend class="mb-1 text-sm font-medium text-ink">
				{{ t('settingsIntegrations.tokens.permissions') }}<span
					class="text-ink-faint"
					aria-hidden="true"
				> *</span>
			</legend>
			<p
				:id="permissionsHintId"
				class="-mt-2 text-xs text-pretty"
				:class="permissionsError ? 'text-danger' : 'text-ink-faint'"
			>
				{{ permissionsError ?? (fixed ? t('settingsIntegrations.tokens.permissionsFixed') : t('settingsIntegrations.tokens.permissionsHint')) }}
			</p>
			<ul
				v-if="fixed"
				role="list"
				class="flex flex-wrap gap-1"
			>
				<li
					v-for="scope in fixedScopes"
					:key="scope"
				>
					<UiChip
						size="sm"
						class="font-mono"
					>
						{{ scope }}
					</UiChip>
				</li>
			</ul>
			<TokenPermissionsPicker
				v-else
				v-model="permissions"
				:routes="routes"
				:locked="locked"
				:presets="presets"
				:loading="routesLoading"
			/>
		</fieldset>
	</form>
</template>
