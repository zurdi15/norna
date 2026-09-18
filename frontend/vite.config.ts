/// <reference types="vitest" />
import {defineConfig, type PluginOption, loadEnv} from 'vite'
import {configDefaults} from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import {URL, fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import {readFileSync} from 'node:fs'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import {VitePWA} from 'vite-plugin-pwa'
import UnpluginInjectPreload from 'unplugin-inject-preload/vite'
import {visualizer} from 'rollup-plugin-visualizer'

import { sentryVitePlugin, type SentryVitePluginOptions } from '@sentry/vite-plugin'
import svgLoader from 'vite-svg-loader'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const pathSrc = fileURLToPath(new URL('./src', import.meta.url)).replaceAll('\\', '/')

/*
** Configure sentry plugin
*/
function getSentryConfig(env: Record<string, string>): SentryVitePluginOptions {
	return {
		// keep these flags for easier debugging
		disable: true,
		debug: true, // print information about which files end up being uploaded
		silent: false,

		// allow compilation to continue but still emit a warning
		errorHandler: (err) => console.warn(err),

		// skipEnvironmentCheck: true,

		// url: 'https://sentry.io', // TODO add env
		authToken: env.SENTRY_AUTH_TOKEN,
		org: env.SENTRY_ORG,
		project: env.SENTRY_PROJECT,

		telemetry: false,

		// sourcemaps: {
			// assets: [], // TODO
			// deleteFilesAfterUpload: [], // TODO define glob
			// rewriteSources // might need that instead of `urlPrefix`
		// },

		release: {
			// name: VERSION, // TODO release version
			setCommits: {
				auto: true,
				ignoreMissing: true,
			},
			deploy: {
				env: env.MODE,
			},
		},

		// sourceMaps: {
		// 	include: ['./dist/assets'],
		// 	ignore: ['node_modules'],
		// 	urlPrefix: '~/assets',
		// },
	}
}

// Preload only the latin files every page renders with; other subsets load on demand
// through their unicode-range. Output names look like /assets/ibm-plex-sans-latin-wght-normal-<hash>.woff2
const FONT_PRELOAD_MATCHER = /^.+\/ibm-plex-(sans-latin-wght-normal|mono-latin-400-normal)-[\w-]+\.woff2$/

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	// https://vitejs.dev/config/#environment-variables
	const env = loadEnv(mode, process.cwd(), '')

	switch (command) {
		case 'serve':
			// this is DEV mode 
			return getServeConfig(env)
			// return getBuildConfig(env)
		case 'build':
			// build for prodution
			return getBuildConfig(env)
	}
})

function getBuildConfig(env: Record<string, string>) {
	const workboxPkgPath = resolve(dirname(pathSrc), 'node_modules/workbox-precaching/package.json')
	const workboxVersion = JSON.parse(readFileSync(workboxPkgPath, 'utf-8')).version

	return {
		base: env.VIKUNJA_FRONTEND_BASE,
		define: {
			__WORKBOX_VERSION__: JSON.stringify(`v${workboxVersion}`),
		},
		// https://vitest.dev/config/
		test: {
			environment: 'happy-dom',
			exclude: [
				...configDefaults.exclude,
				'e2e/**',
			],
			'vitest.commandLine': 'pnpm test:unit',
		},
		plugins: [
			tailwindcss(),
			vue(),
			svgLoader({
				// Since the svgs are already manually optimized via https://jakearchibald.github.io/svgomg/
				// we don't need to optimize them again.
				svgo: false,
			}),
			VueI18nPlugin({
				// TODO: only install needed stuff
				// Whether to install the full set of APIs, components, etc. provided by Vue I18n.
				// By default, all of them will be installed.
				fullInstall: true,
				include: resolve(dirname(pathSrc), './src/i18n/lang/**'),
			}),
			// https://github.com/Applelo/unplugin-inject-preload
			UnpluginInjectPreload({
				files: [{
					outputMatch: FONT_PRELOAD_MATCHER,
					attributes: {crossorigin: 'anonymous'},
				}],
				injectTo: 'custom',
			}),
			VitePWA({
				srcDir: 'src',
				filename: 'sw.ts',
				strategies: 'injectManifest',
				injectRegister: false,
				useCredentials: true,
				manifest: {
					name: 'Norna',
					short_name: 'Norna',
					description: 'Tareas y proyectos, tejidos con calma.',
					// Canvas of the dark theme; the runtime theme-color meta takes over once the app loads.
					theme_color: '#0b0e13',
					icons: [
						{
							src: './images/icons/android-chrome-192x192.png',
							sizes: '192x192',
							type: 'image/png',
						},
						{
							src: './images/icons/android-chrome-512x512.png',
							sizes: '512x512',
							type: 'image/png',
						},
						{
							src: './images/icons/icon-maskable.png',
							sizes: '1024x1024',
							type: 'image/png',
							purpose: 'maskable',
						},
					],
					start_url: '.',
					display: 'standalone',
					background_color: '#0b0e13',
					shortcuts: [
						{
							name: 'Hoy',
							url: '/',
						},
						{
							name: 'Próximas',
							url: '/tasks/by/upcoming',
						},
						{
							name: 'Proyectos',
							url: '/projects',
						},
					],
				},
			}),
			vueDevTools({
				launchEditor: env.VUE_DEVTOOLS_LAUNCH_EDITOR || 'code',
			}),
			// Put the Sentry vite plugin after all other plugins
			sentryVitePlugin(getSentryConfig(env)),
		],
		resolve: {
			alias: [
				{
					find: '@',
					replacement: pathSrc,
				},
			],
			extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
		},
		server: {
			host: '127.0.0.1', // see: https://github.com/vitejs/vite/pull/8543
			port: parseInt(env.VIKUNJA_FRONTEND_PORT || '4173', 10),
			strictPort: true,
		},
		output: {
			manualChunks: {
				// by putting tracking related stuff in a separated file we try to prevent unwanted blocking from ad-blockers
				sentry: ['./src/sentry.ts', '@sentry/*'],
			},
		},
		build: {
			target: 'esnext',
			// required for sentry debugging: tells vite to create source maps
			sourcemap: Boolean(env.SENTRY_AUTH_TOKEN),
			rollupOptions: {
				plugins: [
					visualizer({
						filename: 'stats.html',
						gzipSize: true,
						// template: 'sunburst',
						// brotliSize: true,
					}) as PluginOption,
				],
			},
		},
	}
}

function getServeConfig(env: Record<string, string>) {
	// get some default settings from prod mod
	const buildConfig = getBuildConfig(env)

	// Build the proxy pattern from VIKUNJA_FRONTEND_BASE so that custom base
	// paths like /vikunja proxy /vikunja/api/* correctly.
	// Falls back to /api.
	const base = (env.VIKUNJA_FRONTEND_BASE || '/').replace(/\/+$/, '')
	const proxyPath = `${base}/api`

	// override prod settings with dev settings
	return {
		...buildConfig,
		server: {
			...buildConfig.server,
			...(env.DEV_PROXY && { proxy: {
				[proxyPath]: {
					target: env.DEV_PROXY,
					changeOrigin: true,
					secure: false,
					// Strips prefix for the backend
					rewrite: (path: string) => path.replace(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), ''),
				},
			}}),
		},
	}
}
