<script lang="ts" setup>
import {computed, watch} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {TooltipProvider} from 'reka-ui'

import {userDeletionConfirm} from '@/client/generated'
import {useColorScheme} from '@/composables/useColorScheme'
import {useQuickAddMode} from '@/composables/useQuickAddMode'
import {useServiceWorkerUpdate} from '@/composables/useServiceWorkerUpdate'
import {useTimeTrackingFavicon} from '@/composables/useTimeTrackingFavicon'
import {AUTH_ROUTE_NAMES} from '@/constants/authRouteNames'
import QuickEntry from '@/features/quick-entry/QuickEntry.vue'
import AppReady from '@/features/shell/AppReady.vue'
import AppShell from '@/features/shell/AppShell.vue'
import LinkShareShell from '@/features/shell/LinkShareShell.vue'
import {DEFAULT_LANGUAGE, setLanguage, type SupportedLocale} from '@/i18n'
import {error, success} from '@/message'
import {useAuthStore} from '@/stores/auth'
import UiConfirmHost from '@/ui/UiConfirmHost.vue'
import UiToaster from '@/ui/UiToaster.vue'

const authStore = useAuthStore()
const route = useRoute()

// The desktop app's quick entry window loads the app with ?mode=quick-add: only the
// composer, over a transparent window.
const {isQuickAddMode} = useQuickAddMode()
if (isQuickAddMode) {
	document.documentElement.style.background = 'transparent'
	document.body.style.background = 'transparent'
}
const {t} = useI18n({useScope: 'global'})

// Auth pages and public routes render on their own; everything else needs a session.
const standalone = computed(() => {
	const name = typeof route.name === 'string' ? route.name : ''
	return AUTH_ROUTE_NAMES.has(name) || route.meta.public === true || route.meta.bare === true
})

// The deletion confirmation link from the email lands on any route with this query.
const accountDeletionConfirm = computed(() => route.query?.accountDeletionConfirm as (string | undefined))
watch(accountDeletionConfirm, async token => {
	if (token === undefined) {
		return
	}
	try {
		await userDeletionConfirm({body: {token}})
		success({message: t('auth.deletionConfirmed')})
		authStore.refreshUserInfo()
	} catch (e) {
		error(e)
	}
}, {immediate: true})

setLanguage((authStore.settings.language || DEFAULT_LANGUAGE) as SupportedLocale)
useColorScheme()
useTimeTrackingFavicon()
useServiceWorkerUpdate()
</script>

<template>
	<TooltipProvider :delay-duration="400">
		<AppReady>
			<QuickEntry v-if="isQuickAddMode" />
			<RouterView v-else-if="standalone" />
			<AppShell v-else-if="authStore.authUser" />
			<LinkShareShell v-else-if="authStore.authLinkShare" />
		</AppReady>
		<UiConfirmHost />
	</TooltipProvider>
	<UiToaster />
</template>
