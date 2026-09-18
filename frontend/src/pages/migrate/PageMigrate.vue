<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {ChevronRight} from '@lucide/vue'

import {availableMigrators, migratorRoute} from '@/features/migration/migrators'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {useConfigStore} from '@/stores/config'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'

/** The services this server can import from, each opening its own import. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const migrators = computed(() => availableMigrators(configStore.available_migrators))
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.import')"
		:description="t('migration.description')"
	>
		<UiEmptyState
			v-if="migrators.length === 0"
			:title="t('migration.empty.title')"
			:description="t('migration.empty.description')"
			class="py-8"
		/>
		<div
			v-else
			class="@container"
		>
			<ul
				role="list"
				class="grid gap-2 @lg:grid-cols-2"
			>
				<li
					v-for="migrator in migrators"
					:key="migrator.id"
				>
					<RouterLink
						:to="migratorRoute(migrator)"
						class="
							group flex h-full items-center gap-3 rounded-lg border border-line bg-surface p-3
							transition-colors
							hover:border-line-strong hover:bg-canvas-subtle
							focus-visible:outline-2 focus-visible:outline-accent
							active:bg-canvas-subtle
						"
					>
						<img
							:src="migrator.icon"
							alt=""
							class="size-9 shrink-0 rounded-md object-contain"
						>
						<span class="grid min-w-0 flex-1 gap-0.5">
							<span class="text-base font-medium text-ink pointer-coarse:text-md">{{ migrator.name }}</span>
							<span class="text-sm text-pretty text-ink-muted">{{ t(`migration.services.${migrator.i18nKey}`) }}</span>
						</span>
						<UiIcon
							:icon="ChevronRight"
							size="sm"
							class="text-ink-faint transition-colors group-hover:text-ink-muted"
						/>
					</RouterLink>
				</li>
			</ul>
		</div>
	</SettingsPage>
</template>
