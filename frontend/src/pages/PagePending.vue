<script setup lang="ts">
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'

import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'

// Stands in for every page, so it receives whatever props the route passes.
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const route = useRoute()
</script>

<template>
	<PageHeader
		:title="t('pending.title')"
		:caption="t('pending.caption')"
		large
	>
		<template #actions>
			<MobileRootActions />
		</template>
	</PageHeader>
	<div class="mx-auto max-w-2xl px-4 py-10">
		<UiEmptyState
			:title="t('pending.title')"
			:description="t('pending.description')"
		>
			<template #actions>
				<code class="rounded-sm bg-canvas-subtle px-2 py-1 font-mono text-xs text-ink-muted">{{ String(route.name) }}</code>
			</template>
		</UiEmptyState>
	</div>
</template>
