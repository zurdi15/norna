<script setup lang="ts">
import {watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'

import {useTitle} from '@/composables/useTitle'
import SettingsNav from '@/features/settings/SettingsNav.vue'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'

/** The settings on a phone: the list of sections. Wide screens open the first one instead. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const {isMd} = useBreakpoints()
useTitle(() => t('settings.title'))

watch(isMd, wide => {
	if (wide) {
		void router.replace({name: 'user.settings.general'})
	}
}, {immediate: true})
</script>

<template>
	<PageHeader
		:title="t('settings.title')"
		large
	>
		<template #actions>
			<MobileRootActions />
		</template>
	</PageHeader>
	<div class="pt-4 pb-10">
		<SettingsNav variant="list" />
	</div>
</template>
