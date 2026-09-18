<script lang="ts" setup>
import {computed, watch} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {Toaster} from 'vue-sonner'

import {DEFAULT_LANGUAGE, setLanguage} from '@/i18n'
import {useAuthStore} from '@/stores/auth'
import {useColorScheme} from '@/composables/useColorScheme'
import {useTimeTrackingFavicon} from '@/composables/useTimeTrackingFavicon'
import {success} from '@/message'

const importAccountDeleteService = () => import('@/services/accountDelete')

const authStore = useAuthStore()
const route = useRoute()
const {t} = useI18n({useScope: 'global'})

// The deletion confirmation link from the email lands on any route with this query.
const accountDeletionConfirm = computed(() => route.query?.accountDeletionConfirm as (string | undefined))
watch(accountDeletionConfirm, async (accountDeletionConfirm) => {
	if (accountDeletionConfirm === undefined) {
		return
	}

	const AccountDeleteService = (await importAccountDeleteService()).default
	const accountDeletionService = new AccountDeleteService()
	await accountDeletionService.confirm(accountDeletionConfirm)
	success({message: t('user.deletion.confirmSuccess')})
	authStore.refreshUserInfo()
}, {immediate: true})

setLanguage(authStore.settings.language ?? DEFAULT_LANGUAGE)
const {isDark} = useColorScheme()
useTimeTrackingFavicon()
</script>

<template>
	<RouterView />
	<Toaster
		:theme="isDark ? 'dark' : 'light'"
		position="bottom-center"
		close-button
	/>
</template>
