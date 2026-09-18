import {computed} from 'vue'

import {useAuthStore} from '@/stores/auth'

/**
 * Whether the account signs in with a Norna password. LDAP and OpenID accounts manage
 * their email, password and second factor with their provider instead.
 */
export function useLocalAccount() {
	const authStore = useAuthStore()
	return {
		isLocal: computed(() => authStore.info?.is_local_user !== false),
		provider: computed(() => authStore.info?.auth_provider ?? ''),
	}
}
