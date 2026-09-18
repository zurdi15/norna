<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'

import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'

import NotificationList from './NotificationList.vue'

// Wraps any trigger (a sidebar link, a bell button) around the notification list.
withDefaults(defineProps<{
	side?: 'top' | 'right' | 'bottom' | 'left'
	align?: 'start' | 'center' | 'end'
}>(), {
	side: 'right',
	align: 'start',
})

const {t} = useI18n()
const open = ref(false)
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="t('notifications.title')"
		:side="side"
		:align="align"
		class="w-auto p-0"
	>
		<template #trigger>
			<slot />
		</template>
		<NotificationList @navigate="open = false" />
	</UiAdaptivePopover>
</template>
