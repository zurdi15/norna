import { createI18n } from 'vue-i18n'
import langEN from './lang/en.json'

import { loadDayJsLocale } from '@/i18n/useDayjsLanguageSync.ts'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

export const SUPPORTED_LOCALES = {
	'en': 'English',
	'es-ES': 'Español',
	// IMPORTANT: Also add new languages to useDayjsLanguageSync
} as const

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES

export const DEFAULT_LANGUAGE: SupportedLocale= 'en'

export type ISOLanguage = string

// we load all messages async
export const i18n = createI18n({
	fallbackLocale: DEFAULT_LANGUAGE,
	legacy: false,
	messages: {
		[DEFAULT_LANGUAGE]: langEN,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as Record<SupportedLocale, any>,
})

export async function setLanguage(lang: SupportedLocale): Promise<SupportedLocale | undefined> {
	if (!lang) {
		throw new Error('language is empty')
	}

	// do not change language to the current one
	if (i18n.global.locale.value === lang) {
		return
	}

	// If the language hasn't been loaded yet
	if (!i18n.global.availableLocales.includes(lang)) {
		try {
			const messages = await import(`./lang/${lang}.json`)
			i18n.global.setLocaleMessage(lang, messages.default)
		} catch (e) {
			console.error(`Failed to load language ${lang}:`, e)
			return setLanguage(getBrowserLanguage())
		}
	}
	
	await loadDayJsLocale(lang)

	i18n.global.locale.value = lang
	document.documentElement.lang = lang
	return lang
}

export function getBrowserLanguage(): SupportedLocale {
	// Match on the primary subtag so es-MX or es-AR still get Spanish.
	const primary = navigator.language.split('-')[0]

	const language = Object.keys(SUPPORTED_LOCALES).find(langKey => {
		return langKey === navigator.language || langKey.split('-')[0] === primary
	}) as SupportedLocale | undefined

	return language || DEFAULT_LANGUAGE
}
