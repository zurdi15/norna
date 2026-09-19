<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronDown, UserMinus} from '@lucide/vue'

import type {Permission} from '@/constants/permissions'
import type {UiMenuEntry} from '@/ui/menu'
import UiButton from '@/ui/UiButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {usePermissions} from './permissions'

/**
 * Someone (or a team) with access to the project. Admins change the access or take it
 * away from one menu, a dropdown on desktop and an action sheet on phones.
 */
const props = withDefaults(defineProps<{
	name: string
	// Mono line under the name: a username, a member count.
	detail?: string
	permission: Permission
	// Replaces the permission, e.g. "owner"; the row can't be changed then.
	role?: string
	you?: boolean
	editable?: boolean
	busy?: boolean
	removeLabel: string
}>(), {
	detail: undefined,
	role: undefined,
	you: false,
	editable: false,
	busy: false,
})

const emit = defineEmits<{
	change: [permission: Permission]
	remove: []
}>()

const {t} = useI18n()
const permissions = usePermissions()
const label = computed(() => props.role ?? permissions.labelFor(props.permission))

const menu = computed<UiMenuEntry[]>(() => [
	...permissions.options.value.map(option => ({
		label: option.label,
		icon: option.icon,
		checked: option.value === props.permission,
		onSelect: () => option.value !== props.permission && emit('change', option.value),
	})),
	{type: 'separator'},
	{label: props.removeLabel, icon: UserMinus, tone: 'danger', onSelect: () => emit('remove')},
])
</script>

<template>
	<li class="flex min-h-12 items-center gap-3 py-1">
		<slot name="avatar" />
		<span class="min-w-0 flex-1">
			<span class="block truncate text-base pointer-coarse:text-md">
				{{ name }}
				<span
					v-if="you"
					class="text-ink-faint"
				>· {{ t('teams.you') }}</span>
			</span>
			<span
				v-if="detail"
				class="block truncate font-mono text-2xs text-ink-faint"
			>{{ detail }}</span>
		</span>
		<UiMenu
			v-if="editable && !role"
			:items="menu"
			:title="name"
		>
			<template #trigger>
				<UiButton
					variant="ghost"
					size="sm"
					:icon-end="ChevronDown"
					:loading="busy"
					:aria-label="t('projectShare.accessFor', {name, permission: label})"
					class="-me-2 text-ink-muted pointer-coarse:h-11"
				>
					{{ label }}
				</UiButton>
			</template>
		</UiMenu>
		<span
			v-else
			class="shrink-0 text-sm text-ink-faint"
		>{{ label }}</span>
	</li>
</template>
