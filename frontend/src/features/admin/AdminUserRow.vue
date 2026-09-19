<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Ban, CircleCheck, KeyRound, Mail, ShieldCheck, ShieldOff, Trash2} from '@lucide/vue'

import {USER_STATUS, type AdminUserWithId} from '@/client/queries/admin'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import type {UiMenuEntry} from '@/ui/menu'
import UiChip from '@/ui/UiChip.vue'

import AdminMenuRow from './AdminMenuRow.vue'
import {isLocalAccount, statusBadge} from './userStatus'

/**
 * An account in the admin list. The whole row opens its actions: a menu on wide screens,
 * an action sheet on phones. The admin's own account can't be demoted, disabled or deleted here.
 */
const props = defineProps<{
	user: AdminUserWithId
	isSelf: boolean
}>()

const emit = defineEmits<{
	toggleAdmin: []
	toggleStatus: []
	setPassword: []
	sendReset: []
	delete: []
}>()

const {t} = useI18n()
const dates = useTaskDateFormat()

const badge = computed(() => statusBadge(props.user.status))
const active = computed(() => (props.user.status ?? USER_STATUS.ACTIVE) === USER_STATUS.ACTIVE)
const local = computed(() => isLocalAccount(props.user))
const created = computed(() => props.user.created ? dates.short(new Date(props.user.created)) : '')

const items = computed<UiMenuEntry[]>(() => [
	...(local.value
		? [
			{label: t('admin.users.actions.setPassword'), icon: KeyRound, onSelect: () => emit('setPassword')},
			{label: t('admin.users.actions.sendReset'), icon: Mail, onSelect: () => emit('sendReset')},
			{type: 'separator' as const},
		]
		: []),
	props.user.is_admin
		? {label: t('admin.users.actions.removeAdmin'), icon: ShieldOff, disabled: props.isSelf, onSelect: () => emit('toggleAdmin')}
		: {label: t('admin.users.actions.makeAdmin'), icon: ShieldCheck, onSelect: () => emit('toggleAdmin')},
	active.value
		? {label: t('admin.users.actions.disable'), icon: Ban, disabled: props.isSelf, onSelect: () => emit('toggleStatus')}
		: {label: t('admin.users.actions.enable'), icon: CircleCheck, onSelect: () => emit('toggleStatus')},
	{type: 'separator'},
	{label: t('admin.users.actions.delete'), icon: Trash2, tone: 'danger', disabled: props.isSelf, onSelect: () => emit('delete')},
])
</script>

<template>
	<AdminMenuRow
		:items="items"
		:title="user.username ?? ''"
		data-admin-user
	>
		<UserAvatar
			:username="user.username"
			:name="user.name || user.username"
			size="lg"
		/>
		<div class="min-w-0 flex-1">
			<p class="flex min-w-0 items-center gap-2">
				<span class="truncate text-base font-medium pointer-coarse:text-md">{{ user.name || user.username }}</span>
				<UiChip
					v-if="user.is_admin"
					tone="accent"
					size="sm"
					class="shrink-0"
				>
					{{ t('admin.users.adminBadge') }}
				</UiChip>
				<UiChip
					v-if="badge"
					:tone="badge.tone"
					size="sm"
					class="shrink-0"
				>
					{{ t(badge.key) }}
				</UiChip>
				<span
					v-if="isSelf"
					class="shrink-0 text-xs text-ink-faint"
				>{{ t('admin.users.you') }}</span>
			</p>
			<p class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
				<span class="shrink-0 font-mono">@{{ user.username }}</span>
				<template v-if="user.email">
					<span aria-hidden="true">·</span>
					<span class="truncate">{{ user.email }}</span>
				</template>
			</p>
		</div>
		<span class="hidden w-24 shrink-0 truncate font-mono text-2xs text-ink-faint @2xl:block">
			{{ user.auth_provider || t('admin.users.localAccount') }}
		</span>
		<span class="hidden w-20 shrink-0 text-end font-mono text-2xs text-ink-faint tabular-nums @2xl:block">
			{{ created }}
		</span>
	</AdminMenuRow>
</template>
