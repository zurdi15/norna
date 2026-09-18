import {computed, type Component} from 'vue'
import {useI18n} from 'vue-i18n'
import {
	Bot,
	CalendarSync,
	CircleUser,
	Download,
	Import,
	KeyRound,
	LockKeyhole,
	Mail,
	MonitorSmartphone,
	Plug,
	Rss,
	ShieldCheck,
	SlidersHorizontal,
	Trash2,
	Webhook,
} from '@lucide/vue'

import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'

export interface SettingsNavItem {
	route: string
	// Other routes that belong to the section (the importers under Import).
	also?: string[]
	label: string
	icon: Component
	tone?: 'danger'
}

export interface SettingsNavGroup {
	key: string
	title: string
	items: SettingsNavItem[]
}

export interface SettingsExtraLink {
	text: string
	url: string
}

function isExtraLink(value: unknown): value is SettingsExtraLink {
	const link = value as Partial<Record<keyof SettingsExtraLink, unknown>> | null
	return typeof link?.url === 'string' && typeof link.text === 'string'
}

/**
 * The sections of the settings, grouped, with the ones this server or account can't
 * use left out (a password only exists for local accounts, CalDAV only when enabled…).
 */
export function useSettingsNav() {
	const {t} = useI18n()
	const authStore = useAuthStore()
	const configStore = useConfigStore()

	const groups = computed<SettingsNavGroup[]>(() => {
		const local = authStore.info?.is_local_user ?? false
		const entries: {key: string, items: (SettingsNavItem | false)[]}[] = [
			{key: 'account', items: [
				{route: 'user.settings.general', label: t('settings.nav.general'), icon: SlidersHorizontal},
				{route: 'user.settings.avatar', label: t('settings.nav.avatar'), icon: CircleUser},
				local && {route: 'user.settings.email-update', label: t('settings.nav.email'), icon: Mail},
				local && {route: 'user.settings.password-update', label: t('settings.nav.password'), icon: LockKeyhole},
			]},
			{key: 'security', items: [
				configStore.totp_enabled && local && {route: 'user.settings.totp', label: t('settings.nav.totp'), icon: ShieldCheck},
				{route: 'user.settings.sessions', label: t('settings.nav.sessions'), icon: MonitorSmartphone},
				{route: 'user.settings.apiTokens', label: t('settings.nav.apiTokens'), icon: KeyRound},
			]},
			{key: 'integrations', items: [
				configStore.caldav_enabled && {route: 'user.settings.caldav', label: t('settings.nav.caldav'), icon: CalendarSync},
				{route: 'user.settings.mcp', label: t('settings.nav.mcp'), icon: Plug},
				{route: 'user.settings.feeds', label: t('settings.nav.feeds'), icon: Rss},
				configStore.webhooks_enabled && {route: 'user.settings.webhooks', label: t('settings.nav.webhooks'), icon: Webhook},
				{route: 'user.settings.bots', label: t('settings.nav.bots'), icon: Bot},
			]},
			{key: 'data', items: [
				configStore.available_migrators.length > 0 && {route: 'migrate.start', also: ['migrate.csv', 'migrate.service'], label: t('settings.nav.import'), icon: Import},
				{route: 'user.settings.data-export', label: t('settings.nav.export'), icon: Download},
				configStore.user_deletion_enabled && {route: 'user.settings.deletion', label: t('settings.nav.deletion'), icon: Trash2, tone: 'danger'},
			]},
		]
		return entries
			.map(({key, items}) => ({key, title: t(`settings.groups.${key}`), items: items.filter(item => item !== false)}))
			.filter(group => group.items.length > 0)
	})

	// Links an administrator adds to the settings (a company handbook, a password policy…).
	const extraLinks = computed(() => Object.values(authStore.settings.extra_settings_links ?? {}).filter(isExtraLink))

	return {groups, extraLinks}
}
