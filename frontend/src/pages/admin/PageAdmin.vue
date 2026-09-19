<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {FolderKanban, LayoutDashboard, Link2, Users} from '@lucide/vue'

import {PRO_FEATURE} from '@/constants/proFeatures'
import {useTitle} from '@/composables/useTitle'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useConfigStore} from '@/stores/config'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiIcon from '@/ui/UiIcon.vue'

/** The admin area: its sections as tabs under the header (scrolling sideways on phones), the open one below. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const {isMd} = useBreakpoints()
useTitle(() => t('admin.title'))

const tabs = computed(() => [
	{route: 'admin.overview', label: t('admin.nav.overview'), icon: LayoutDashboard},
	{route: 'admin.users', label: t('admin.nav.users'), icon: Users},
	{route: 'admin.projects', label: t('admin.nav.projects'), icon: FolderKanban},
	...(configStore.isProFeatureEnabled(PRO_FEATURE.USER_INVITES)
		? [{route: 'admin.inviteLinks', label: t('admin.nav.inviteLinks'), icon: Link2}]
		: []),
])
</script>

<template>
	<PageHeader
		:title="t('admin.title')"
		:back="!isMd"
	>
		<template #below>
			<nav
				:aria-label="t('admin.nav.label')"
				class="flex gap-5 overflow-x-auto px-4 lg:px-6"
			>
				<RouterLink
					v-for="tab in tabs"
					:key="tab.route"
					:to="{name: tab.route}"
					class="
						flex h-10 shrink-0 items-center gap-1.5 border-b-[1.5px] border-transparent text-sm
						whitespace-nowrap text-ink-muted transition-colors
						hover:text-ink
						aria-[current=page]:border-ink aria-[current=page]:text-ink
						pointer-coarse:h-11
					"
				>
					<UiIcon
						:icon="tab.icon"
						size="sm"
					/>
					{{ tab.label }}
				</RouterLink>
			</nav>
		</template>
	</PageHeader>
	<RouterView />
</template>
