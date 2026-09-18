<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {useOnline} from '@vueuse/core'

import AuthLayout from '@/features/auth/AuthLayout.vue'
import {useBaseStore} from '@/stores/base'
import UiEmptyState from '@/ui/UiEmptyState.vue'

import ApiConfigForm from './ApiConfigForm.vue'
import SplashScreen from './SplashScreen.vue'

// Nothing below renders until /info and the session check are done.
const {t} = useI18n()
const baseStore = useBaseStore()
const online = useOnline()
</script>

<template>
	<SplashScreen v-if="baseStore.loading" />
	<div
		v-else-if="!baseStore.ready && !online"
		class="grid min-h-dvh place-items-center px-4"
	>
		<UiEmptyState
			:title="t('shell.offlineTitle')"
			:description="t('shell.offlineDescription')"
		/>
	</div>
	<AuthLayout
		v-else-if="baseStore.error"
		:title="t('shell.api.title')"
		:description="t('shell.api.description')"
	>
		<ApiConfigForm @found="baseStore.loadApp()" />
	</AuthLayout>
	<slot v-else />
</template>
