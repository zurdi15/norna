<script setup lang="ts">
import {RouterLink} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {House} from '@lucide/vue'

import {useTitle} from '@/composables/useTitle'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'

const {t} = useI18n()
useTitle(() => t('notFound.title'))
</script>

<template>
	<div class="grid min-h-[70dvh] place-items-center px-4">
		<UiEmptyState
			:title="t('notFound.title')"
			:description="t('notFound.description')"
		>
			<template #actions>
				<UiButton
					:as="RouterLink"
					:to="{name: 'home'}"
					variant="primary"
					:icon="House"
				>
					{{ t('notFound.home') }}
				</UiButton>
			</template>
		</UiEmptyState>
	</div>
</template>
