import {computed} from 'vue'

import type {QuickAddSettings} from '@/client/queries/tasks'
import {useAuthStore} from '@/stores/auth'

/** The user's quick add preferences: which magic prefixes apply and the reminders every new task gets. */
export function useQuickAddSettings() {
	const authStore = useAuthStore()
	return computed<QuickAddSettings>(() => ({
		magicMode: authStore.settings.frontend_settings.quick_add_magic_mode,
		defaultReminders: authStore.settings.frontend_settings.quick_add_default_reminders,
	}))
}
