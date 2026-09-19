<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Globe, LogOut, Monitor, Smartphone, Tablet} from '@lucide/vue'

import type {UserSession} from '@/client/queries/sessions'
import {formatDateLong, formatDateSince} from '@/helpers/time/formatDate'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'

import {describeUserAgent, deviceName} from './userAgent'

/** One signed-in device: what it is, where from and when it was last used. */
const props = withDefaults(defineProps<{
	session: UserSession
	current?: boolean
	revoking?: boolean
}>(), {
	current: false,
	revoking: false,
})

const emit = defineEmits<{
	revoke: []
}>()

const {t} = useI18n()

const ICONS = {desktop: Monitor, phone: Smartphone, tablet: Tablet, other: Globe} as const

const device = computed(() => describeUserAgent(props.session.device_info))
const name = computed(() => deviceName(props.session.device_info, t))
</script>

<template>
	<div class="flex items-center gap-3 py-3">
		<span class="grid size-8 shrink-0 place-items-center rounded-md bg-canvas-subtle text-ink-muted">
			<UiIcon :icon="ICONS[device.kind]" />
		</span>
		<div class="min-w-0 flex-1">
			<p class="flex min-w-0 items-center gap-2">
				<span
					class="truncate text-base text-ink pointer-coarse:text-md"
					:title="session.device_info"
				>{{ name }}</span>
				<UiChip
					v-if="current"
					tone="accent"
					size="sm"
					class="shrink-0"
				>
					{{ t('settingsAccount.sessions.thisDevice') }}
				</UiChip>
			</p>
			<p class="mt-0.5 flex min-w-0 flex-wrap gap-x-2 font-mono text-2xs text-ink-faint">
				<span v-if="session.ip_address">{{ session.ip_address }}</span>
				<time
					v-if="session.last_active"
					:datetime="session.last_active"
					:title="formatDateLong(session.last_active)"
				>{{ t('settingsAccount.sessions.lastActive', {time: formatDateSince(session.last_active)}) }}</time>
			</p>
		</div>
		<UiButton
			v-if="!current"
			variant="ghost"
			size="sm"
			:icon="LogOut"
			:loading="revoking"
			:aria-label="t('settingsAccount.sessions.revokeNamed', {device: name})"
			class="shrink-0 pointer-coarse:h-11"
			@click="emit('revoke')"
		>
			{{ t('settingsAccount.sessions.revoke') }}
		</UiButton>
	</div>
</template>
