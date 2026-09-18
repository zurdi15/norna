<script setup lang="ts">
import {computed, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink, useRoute, useRouter} from 'vue-router'
import {ArrowLeft} from '@lucide/vue'

import {getMigrator, oauthCode} from '@/features/migration/migrators'
import ServiceImport from '@/features/migration/ServiceImport.vue'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import {useConfigStore} from '@/stores/config'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'

/** Importing from one service, and where an OAuth service sends the user back to. */
const props = defineProps<{
	service: string
	code?: string
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()

const migrator = computed(() => {
	const found = getMigrator(props.service)
	return found && found.kind !== 'csv' && configStore.available_migrators.includes(found.id) ? found : undefined
})

// The CSV import maps columns first, so it has a page of its own.
watch(() => props.service, service => {
	if (service === 'csv') {
		void router.replace({name: 'migrate.csv'})
	}
}, {immediate: true})

const code = computed(() => oauthCode(props.code, route.hash))

function forgetCode() {
	const {code: _code, ...query} = route.query
	void router.replace({query, hash: ''})
}
</script>

<template>
	<SettingsPage
		:title="migrator ? t('migration.service.title', {name: migrator.name}) : t('settings.nav.import')"
		:back="{name: 'migrate.start'}"
	>
		<ServiceImport
			v-if="migrator"
			:key="migrator.id"
			:migrator="migrator"
			:code="code"
			@codeUsed="forgetCode"
		/>
		<UiEmptyState
			v-else
			:title="t('migration.unavailable.title')"
			:description="t('migration.unavailable.description')"
			class="py-8"
		>
			<template #actions>
				<UiButton
					:as="RouterLink"
					:to="{name: 'migrate.start'}"
					:icon="ArrowLeft"
				>
					{{ t('migration.allImporters') }}
				</UiButton>
			</template>
		</UiEmptyState>
	</SettingsPage>
</template>
