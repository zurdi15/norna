import {computed} from 'vue'
import isEqual from 'fast-deep-equal'
import {useI18n} from 'vue-i18n'

import {
	applySettingsPatch,
	revertSettingsPatch,
	updateUserSettings,
	type UserSettingsPatch,
} from '@/client/queries/user'
import {setLanguage, type SupportedLocale} from '@/i18n'
import {error, success} from '@/message'
import type {FrontendSettings, UserSettings} from '@/modules/settings/userSettings'
import {useAuthStore, type CurrentUser} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'

// Saves go out one after another, each with the settings as they are by then, so the
// server always ends up with the latest ones even when changes come in quick succession.
let queue: Promise<unknown> = Promise.resolve()

/**
 * The general settings and how they save: the store changes at once, the server
 * follows, and a failed save puts the old values back.
 */
export function useAccountSettings() {
	const {t} = useI18n()
	const authStore = useAuthStore()
	const configStore = useConfigStore()

	// The store hands out a readonly view; saves only ever build new objects from it.
	const current = () => authStore.settings as UserSettings
	const settings = computed(() => authStore.settings)
	const frontend = computed(() => authStore.settings.frontend_settings)

	function showName(name: string) {
		if (authStore.info) {
			authStore.setUser({...authStore.info, name} as CurrentUser)
		}
	}

	async function save(patch: UserSettingsPatch): Promise<boolean> {
		const previous = current()
		const next = applySettingsPatch(previous, patch)
		if (isEqual(next, previous)) {
			return true
		}
		authStore.setSettings(next)
		if (patch.name !== undefined) {
			showName(patch.name)
		}
		if (patch.language !== undefined) {
			await setLanguage(patch.language as SupportedLocale)
		}

		const request = queue.then(() => updateUserSettings(current(), configStore.demo_mode_enabled))
		queue = request.catch(() => undefined)
		try {
			await request
		} catch (e) {
			authStore.setSettings(revertSettingsPatch(current(), patch, previous))
			if (patch.name !== undefined) {
				showName(authStore.settings.name)
			}
			if (patch.language !== undefined) {
				await setLanguage(authStore.settings.language as SupportedLocale)
			}
			error(e)
			return false
		}

		// Initials avatars are drawn from the name.
		if (patch.name !== undefined && patch.name !== previous.name) {
			authStore.invalidateAvatar()
		}
		// Same text, same toast: quick changes refresh one "Saved" instead of stacking.
		success({message: t('settings.saved')})
		return true
	}

	function saveFrontend(patch: Partial<FrontendSettings>) {
		return save({frontend_settings: patch})
	}

	return {settings, frontend, save, saveFrontend}
}
