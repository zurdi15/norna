<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import SettingsNav from '@/features/settings/SettingsNav.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'

/**
 * The settings: the sections beside the open one on wide screens. On phones the
 * list of sections is a screen of its own (PageSettingsIndex) and each opens full.
 */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const {isMd} = useBreakpoints()
</script>

<template>
	<template v-if="isMd">
		<PageHeader :title="t('settings.title')" />
		<div class="mx-auto flex max-w-5xl gap-10 px-6 py-8">
			<aside class="sticky top-22 w-52 shrink-0 self-start">
				<SettingsNav />
			</aside>
			<div class="max-w-2xl min-w-0 flex-1">
				<RouterView />
			</div>
		</div>
	</template>
	<RouterView v-else />
</template>
