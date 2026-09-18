import './client/inviteLink'
import {createApp} from 'vue'
import {VueQueryPlugin} from '@tanstack/vue-query'

import '@fontsource-variable/ibm-plex-sans/wght.css'
import '@fontsource-variable/ibm-plex-sans/wght-italic.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-ext-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-ext-500.css'
import 'vue-sonner/style.css'
import './styles/main.css'

import pinia from './pinia'
import router from './router'
import App from './App.vue'
import {error, success} from './message'
import {configureApiClient} from './client/http'
import {queryClient} from './client/queryClient'

// PWA
import './registerServiceWorker'

// i18n
import {getBrowserLanguage, i18n, setLanguage} from './i18n'

declare global {
	interface Window {
		API_URL: string;
		SENTRY_ENABLED?: boolean;
		SENTRY_DSN?: string;
		CUSTOM_LOGO_URL?: string;
		CUSTOM_LOGO_URL_DARK?: string;
	}
}

// Check if we have an api url in local storage and use it if that's the case
const apiUrlFromStorage = localStorage.getItem('API_URL')
if (apiUrlFromStorage !== null) {
	window.API_URL = apiUrlFromStorage
}

// Make sure the api url does not contain a / at the end
if (window.API_URL.endsWith('/')) {
	window.API_URL = window.API_URL.slice(0, -1)
}

configureApiClient()

// directives
import focus from '@/directives/focus'
import shortcut from '@/directives/shortcut'
import testid from '@/directives/testid'

import {handleChunkLoadErrors} from '@/helpers/handleChunkLoadErrors'

handleChunkLoadErrors()

// We're loading the language before creating the app so that it won't fail to load when the user's
// language file is not yet loaded.
const browserLanguage = getBrowserLanguage()
setLanguage(browserLanguage).then(() => {
	const app = createApp(App)

	if (window.SENTRY_ENABLED) {
		try {
			import('./sentry').then(sentry => sentry.default(app, router))
		} catch (e) {
			console.error('Could not enable Sentry tracking', e)
		}
	}

	app.use(VueQueryPlugin, {queryClient})

	app.directive('focus', focus)
	app.directive('shortcut', shortcut)
	app.directive('cy', testid)

	app.config.errorHandler = (err, vm, info) => {
		if (import.meta.env.DEV) {
			console.error(err, vm, info)
		}
		error(err)
	}

	if (import.meta.env.DEV) {
		app.config.warnHandler = (msg) => {
			error(msg)
			throw msg
		}

		// https://stackoverflow.com/a/52076738/15522256
		window.addEventListener('error', (err) => {
			error(err)
			throw err
		})


		window.addEventListener('unhandledrejection', (err) => {
			// event.promise contains the promise object
			// event.reason contains the reason for the rejection
			error(err)
			throw err
		})
	}

	app.config.globalProperties.$message = {
		error,
		success,
	}

	app.use(pinia)
	app.use(router)
	app.use(i18n)

	app.mount('#app')
})
