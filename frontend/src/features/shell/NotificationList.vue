<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {CheckCheck} from '@lucide/vue'

import type {DatabaseNotification} from '@/client/generated'
import {isUnread, useMarkAllNotificationsReadMutation, useMarkNotificationMutation} from '@/client/queries/notifications'
import {useNotifications} from '@/composables/useNotifications'
import {formatDateSince} from '@/helpers/time/formatDate'
import {describeNotification} from '@/modules/notifications/describe'
import {getDisplayName} from '@/modules/user/displayName'
import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import UserAvatar from './UserAvatar.vue'

const emit = defineEmits<{
	// Opening a notification navigates away, so the surrounding overlay should close.
	navigate: []
}>()

const {t} = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const {notifications, unreadCount, isPending} = useNotifications()
const {mutate: markNotification} = useMarkNotificationMutation()
const {mutate: markAllRead, isPending: markingAll} = useMarkAllNotificationsReadMutation()

const items = computed(() => notifications.value.map(notification => {
	const description = describeNotification(notification, authStore.info?.id)
	return {
		notification,
		description,
		actorName: description.actor ? getDisplayName(description.actor) : undefined,
	}
}))

function open(notification: DatabaseNotification, to: ReturnType<typeof describeNotification>['to']) {
	if (notification.id !== undefined && isUnread(notification)) {
		markNotification({id: notification.id, read: true})
	}
	if (to) {
		emit('navigate')
		router.push(to)
	}
}
</script>

<template>
	<div class="flex min-h-0 flex-col md:w-96">
		<div class="flex items-center gap-2 px-4 py-2.5 md:border-b md:border-line">
			<p class="hidden flex-1 text-sm font-semibold md:block">
				{{ t('notifications.title') }}
			</p>
			<span class="flex-1 md:hidden" />
			<UiButton
				v-if="unreadCount > 0"
				variant="ghost"
				size="sm"
				:icon="CheckCheck"
				:loading="markingAll"
				@click="markAllRead()"
			>
				{{ t('notifications.markAllRead') }}
			</UiButton>
		</div>
		<div
			v-if="isPending"
			class="grid gap-3 p-4"
		>
			<UiSkeleton
				v-for="i in 3"
				:key="i"
				class="h-10"
			/>
		</div>
		<UiEmptyState
			v-else-if="notifications.length === 0"
			:title="t('notifications.emptyTitle')"
			:description="t('notifications.emptyDescription')"
			class="py-10"
		/>
		<ul
			v-else
			class="max-h-[min(28rem,70dvh)] overflow-y-auto p-1 md:max-h-112"
		>
			<li
				v-for="{notification, description, actorName} in items"
				:key="notification.id"
			>
				<button
					type="button"
					:class="cn(
						'flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-start',
						'transition-colors duration-150 hover:bg-canvas-subtle',
						!description.to && 'cursor-default',
					)"
					@click="open(notification, description.to)"
				>
					<UserAvatar
						v-if="description.actor"
						:username="description.actor.username"
						:name="actorName"
						size="md"
						class="mt-0.5"
					/>
					<span
						v-else
						class="mt-0.5 size-6 shrink-0 rounded-full bg-accent-subtle"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1">
						<span class="block text-sm text-pretty">
							<strong
								v-if="actorName"
								class="font-semibold"
							>{{ actorName }} </strong>
							{{ t(description.key, description.params) }}
						</span>
						<span class="mt-0.5 block font-mono text-2xs text-ink-faint">{{ formatDateSince(notification.created) }}</span>
					</span>
					<span
						v-if="isUnread(notification)"
						class="mt-2 size-2 shrink-0 rounded-full bg-accent"
						:aria-label="t('notifications.unread')"
					/>
				</button>
			</li>
		</ul>
	</div>
</template>
