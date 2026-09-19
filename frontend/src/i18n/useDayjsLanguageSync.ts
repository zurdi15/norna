import type dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'

import { i18n, type ISOLanguage, type SupportedLocale } from '@/i18n'

// English is dayjs' built-in default, so only the other locales are mapped and imported.
type DayjsLocaleKey = Lowercase<Exclude<SupportedLocale, 'en'>>

export const DAYJS_LOCALE_MAPPING: Record<DayjsLocaleKey, ISOLanguage> = {
	'es-es': 'es',
}

export const DAYJS_LANGUAGE_IMPORTS: Record<DayjsLocaleKey, () => Promise<unknown>> = {
	'es-es': () => import('dayjs/locale/es'),
}

// dayjs locale code for an app locale; English (and anything unmapped) stays on dayjs' built-in 'en'.
export function getDayjsLocale(locale: string): ISOLanguage {
	return DAYJS_LOCALE_MAPPING[locale.toLowerCase() as DayjsLocaleKey] ?? 'en'
}

export async function loadDayJsLocale(language: SupportedLocale) {
	if (language === 'en') {
		return
	}

	await DAYJS_LANGUAGE_IMPORTS[language.toLowerCase() as DayjsLocaleKey]()
}

export function useDayjsLanguageSync(dayjsGlobal: typeof dayjs) {

	const dayjsLanguageLoaded = ref(false)
	watch(
		() => i18n.global.locale.value,
		async (currentLanguage: string) => {
			if (!dayjsGlobal) {
				return
			}
			const dayjsLanguageCode = getDayjsLocale(currentLanguage)
			dayjsLanguageLoaded.value = dayjsGlobal.locale() === dayjsLanguageCode
			if (dayjsLanguageLoaded.value) {
				return
			}
			await loadDayJsLocale(currentLanguage as SupportedLocale)
			dayjsGlobal.locale(dayjsLanguageCode)
			dayjsLanguageLoaded.value = true
		},
		{immediate: true},
	)

	// we export the loading state since that's easier to work with
	const isLoading = computed(() => !dayjsLanguageLoaded.value)

	return isLoading
}
