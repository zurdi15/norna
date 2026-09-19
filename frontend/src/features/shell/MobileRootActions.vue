<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {Bell} from '@lucide/vue'

import {useNotifications} from '@/composables/useNotifications'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiIcon from '@/ui/UiIcon.vue'

import NotificationsPopover from './NotificationsPopover.vue'
import UserMenu from './UserMenu.vue'

// On phones the root screens carry what the sidebar holds on larger screens.
const {t} = useI18n()
const {isMd} = useBreakpoints()
const {unreadCount} = useNotifications()
</script>

<template>
	<template v-if="!isMd">
		<NotificationsPopover>
			<button
				type="button"
				class="relative grid size-10 cursor-pointer place-items-center rounded-md text-ink-muted"
				:aria-label="unreadCount > 0 ? t('notifications.titleWithUnread', {count: unreadCount}) : t('notifications.title')"
			>
				<UiIcon
					:icon="Bell"
					size="lg"
				/>
				<span
					v-if="unreadCount > 0"
					class="absolute inset-e-2 top-2 size-2 rounded-full bg-accent ring-2 ring-canvas"
				/>
			</button>
		</NotificationsPopover>
		<UserMenu variant="icon" />
	</template>
</template>
