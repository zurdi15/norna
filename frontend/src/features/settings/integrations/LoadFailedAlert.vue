<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'

/** Something didn't load, with a way to try again. */
const emit = defineEmits<{
	retry: []
}>()

const {t} = useI18n()
</script>

<template>
	<UiAlert tone="danger">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span class="flex-1">{{ t('settingsIntegrations.loadFailed') }}</span>
			<UiButton
				variant="ghost"
				size="sm"
				class="-my-1 pointer-coarse:h-9"
				@click="emit('retry')"
			>
				{{ t('settingsIntegrations.retry') }}
			</UiButton>
		</div>
	</UiAlert>
</template>
