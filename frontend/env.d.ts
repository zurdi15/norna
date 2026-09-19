/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

interface ImportMetaEnv {
	readonly NORNA_API_URL?: string
	readonly NORNA_HTTP_PORT?: number
	readonly NORNA_HTTPS_PORT?: number

	readonly NORNA_SENTRY_ENABLED?: boolean
	readonly NORNA_SENTRY_DSN?: string

	readonly SENTRY_AUTH_TOKEN?: string
	readonly SENTRY_ORG?: string
	readonly SENTRY_PROJECT?: string

	readonly VITE_IS_ONLINE: boolean

	readonly VUE_DEVTOOLS_LAUNCH_EDITOR: VitePluginVueDevToolsOptions.launchEditor
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
