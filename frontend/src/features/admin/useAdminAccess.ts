import {computed} from 'vue'

import {PRO_FEATURE} from '@/constants/proFeatures'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'

/** Whether to offer the admin panel: the server has it on and this user is an instance admin. */
export function useAdminAccess() {
	const authStore = useAuthStore()
	const configStore = useConfigStore()
	return computed(() => authStore.info?.is_admin === true && configStore.isProFeatureEnabled(PRO_FEATURE.ADMIN_PANEL))
}
