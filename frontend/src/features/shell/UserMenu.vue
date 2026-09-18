<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {ChevronsUpDown, Info, Keyboard, LogOut, Monitor, Moon, Settings, Shield, Sun} from '@lucide/vue'

import {useAdminAccess} from '@/features/admin/useAdminAccess'
import {useAuthStore} from '@/stores/auth'
import {useShellStore} from '@/stores/shell'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import type {UiMenuEntry} from '@/ui/menu'
import UiIcon from '@/ui/UiIcon.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {useBackdropLink} from './useRouteBackdrop'
import UserAvatar from './UserAvatar.vue'

// row: the sidebar's account row; icon: just the avatar, for phone headers.
withDefaults(defineProps<{
	variant?: 'row' | 'icon'
	collapsed?: boolean
}>(), {
	variant: 'row',
	collapsed: false,
})

const {t} = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const shell = useShellStore()
const backdropLink = useBackdropLink()
const canAdminister = useAdminAccess()
const {hasFinePointer} = useBreakpoints()

const colorScheme = computed(() => authStore.settings.frontend_settings.color_schema)

function setColorScheme(value: 'auto' | 'light' | 'dark') {
	authStore.saveFrontendSettings({color_schema: value})
}

const items = computed<UiMenuEntry[]>(() => [
	{label: t('shell.user.settings'), icon: Settings, onSelect: () => router.push({name: 'user.settings'})},
	...(canAdminister.value
		? [{label: t('shell.user.admin'), icon: Shield, onSelect: () => router.push({name: 'admin.overview'})}]
		: []),
	{type: 'separator'},
	{type: 'label', label: t('shell.user.theme')},
	{label: t('shell.user.themeSystem'), icon: Monitor, checked: colorScheme.value === 'auto', onSelect: () => setColorScheme('auto')},
	{label: t('shell.user.themeLight'), icon: Sun, checked: colorScheme.value === 'light', onSelect: () => setColorScheme('light')},
	{label: t('shell.user.themeDark'), icon: Moon, checked: colorScheme.value === 'dark', onSelect: () => setColorScheme('dark')},
	{type: 'separator'},
	...(hasFinePointer.value
		? [{label: t('shell.shortcuts.title'), icon: Keyboard, shortcut: 'Shift+Slash', onSelect: () => shell.shortcutsOpen = true}]
		: []),
	{label: t('shell.user.about'), icon: Info, onSelect: () => router.push(backdropLink({name: 'about'}))},
	{type: 'separator'},
	{label: t('shell.user.logout'), icon: LogOut, tone: 'danger', onSelect: () => authStore.logout()},
])
</script>

<template>
	<UiMenu
		:items="items"
		:title="authStore.userDisplayName ?? t('shell.user.account')"
		:side="variant === 'row' ? 'top' : 'bottom'"
		:align="variant === 'row' ? 'start' : 'end'"
	>
		<template #trigger>
			<button
				v-if="variant === 'icon'"
				type="button"
				class="grid size-10 cursor-pointer place-items-center rounded-full"
				:aria-label="t('shell.user.account')"
			>
				<UserAvatar
					:username="authStore.info?.username"
					:name="authStore.userDisplayName"
					size="md"
				/>
			</button>
			<button
				v-else
				type="button"
				:aria-label="collapsed ? t('shell.user.account') : undefined"
				:class="cn(
					'flex h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-start text-base',
					'text-ink transition-colors duration-150 hover:bg-surface',
					collapsed && 'justify-center px-0',
				)"
			>
				<UserAvatar
					:username="authStore.info?.username"
					:name="authStore.userDisplayName"
					size="md"
				/>
				<template v-if="!collapsed">
					<span class="min-w-0 flex-1 truncate">{{ authStore.userDisplayName }}</span>
					<UiIcon
						:icon="ChevronsUpDown"
						size="sm"
						class="text-ink-faint"
					/>
				</template>
			</button>
		</template>
	</UiMenu>
</template>
