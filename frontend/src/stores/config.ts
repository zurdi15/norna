import {computed, reactive, toRefs} from 'vue'
import {acceptHMRUpdate, defineStore} from 'pinia'
import {parseURL} from 'ufo'

import {info, type NornaInfos} from '@/client/generated'
import {getApiV2BaseUrl} from '@/helpers/apiUrl'
import {InvalidApiUrlProvidedError} from '@/helpers/checkAndSetApiUrl'
import type {ProFeature} from '@/constants/proFeatures'

type DeepRequired<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends Array<infer U>
		? U[]
		: NonNullable<T[K]> extends object ? DeepRequired<NonNullable<T[K]>> : NonNullable<T[K]>
}

// The server info from /info with every field present. enabled_pro_features is typed as
// numbers in the spec, but license.Feature marshals to its string key (pkg/license).
export type ServerInfo = Omit<DeepRequired<NornaInfos>, '$schema' | 'enabled_pro_features'> & {
	enabled_pro_features: string[]
}

// The API's own defaults, used until /info has loaded.
const DEFAULT_INFO: ServerInfo = {
	version: '',
	frontend_url: '',
	motd: '',
	link_sharing_enabled: true,
	max_file_size: '20MB',
	max_items_per_page: 50,
	available_migrators: [],
	task_attachments_enabled: true,
	totp_enabled: true,
	enabled_background_providers: [],
	legal: {
		imprint_url: '',
		privacy_policy_url: '',
	},
	caldav_enabled: false,
	user_deletion_enabled: true,
	task_comments_enabled: true,
	demo_mode_enabled: false,
	webhooks_enabled: false,
	email_reminders_enabled: true,
	auth: {
		local: {
			enabled: true,
			registration_enabled: true,
		},
		ldap: {
			enabled: false,
		},
		openid_connect: {
			enabled: false,
			providers: [],
		},
	},
	public_teams_enabled: false,
	allow_icon_changes: true,
	enabled_pro_features: [],
	concurrent_writes: false,
}

function withDefaults(data: NornaInfos): ServerInfo {
	return {
		...DEFAULT_INFO,
		...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined)),
		legal: {...DEFAULT_INFO.legal, ...data.legal},
		auth: {
			local: {...DEFAULT_INFO.auth.local, ...data.auth?.local},
			ldap: {...DEFAULT_INFO.auth.ldap, ...data.auth?.ldap},
			openid_connect: {
				enabled: data.auth?.openid_connect?.enabled ?? false,
				providers: data.auth?.openid_connect?.providers ?? [],
			},
		},
		available_migrators: data.available_migrators ?? [],
		enabled_background_providers: data.enabled_background_providers ?? [],
		enabled_pro_features: (data.enabled_pro_features ?? []).map(String),
	} as ServerInfo
}

export const useConfigStore = defineStore('config', () => {
	const state = reactive<ServerInfo>(structuredClone(DEFAULT_INFO))

	const migratorsEnabled = computed(() => state.available_migrators.length > 0)
	const apiBase = computed(() => {
		const {host, protocol, pathname} = parseURL(window.API_URL)

		// Strip the /api/v1 suffix (and optional trailing slash) to get the deployment base.
		const basePath = pathname
			.replace(/\/api\/v1\/?$/, '')
			.replace(/\/+$/, '')
		return `${protocol}//${host}${basePath}`
	})

	function setConfig(config: NornaInfos) {
		Object.assign(state, withDefaults(config))
	}

	function isProFeatureEnabled(name: ProFeature): boolean {
		return state.enabled_pro_features.includes(name)
	}

	async function update(): Promise<boolean> {
		// checkAndSetApiUrl() probes candidate URLs before the client is reconfigured,
		// so the base comes from the current window.API_URL on every call. Without the
		// trailing slash, as the client is configured (client/requestContext compares them).
		const {data} = await info({baseUrl: getApiV2BaseUrl().replace(/\/$/, '')})

		if (typeof data?.version === 'undefined') {
			throw new InvalidApiUrlProvidedError()
		}

		setConfig(data)
		return true
	}

	return {
		...toRefs(state),

		migratorsEnabled,
		apiBase,
		setConfig,
		isProFeatureEnabled,
		update,
	}
})

// support hot reloading
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useConfigStore, import.meta.hot))
}
