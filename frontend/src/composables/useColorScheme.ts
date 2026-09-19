import {computed, watch, readonly} from 'vue'
import {createSharedComposable, usePreferredColorScheme, tryOnMounted} from '@vueuse/core'
import type {BasicColorSchema} from '@vueuse/core'
import {useAuthStore} from '@/stores/auth'

const DEFAULT_COLOR_SCHEME_SETTING: BasicColorSchema = 'light'

// Browser chrome can't read CSS tokens; keep in sync with --color-canvas in styles/tokens.css.
const THEME_COLOR = {
	light: '#f9fafc',
	dark: '#0b0e13',
} as const

// Resolves the user's setting (light/dark/auto) against the OS preference and pins the
// result on <html data-theme>, which sets color-scheme and so every light-dark() token.
export const useColorScheme = createSharedComposable(() => {
	const authStore = useAuthStore()
	const store = computed(() => authStore.settings.frontend_settings.color_schema)

	const preferredColorScheme = usePreferredColorScheme()

	const isDark = computed<boolean>(() => {
		if (store.value !== 'auto') {
			return store.value === 'dark'
		}

		const autoColorScheme = preferredColorScheme.value === 'no-preference'
			? DEFAULT_COLOR_SCHEME_SETTING
			: preferredColorScheme.value
		return autoColorScheme === 'dark'
	})

	function onChanged(dark: boolean) {
		const theme = dark ? 'dark' : 'light'
		document.documentElement.dataset.theme = theme
		// index.html ships one meta per scheme for the first paint; an explicit choice overrides both.
		document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
			.forEach(meta => meta.content = THEME_COLOR[theme])
	}

	watch(isDark, onChanged, {flush: 'post'})

	tryOnMounted(() => onChanged(isDark.value))

	return {
		store,
		isDark: readonly(isDark),
	}
})
