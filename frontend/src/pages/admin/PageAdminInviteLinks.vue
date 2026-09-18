<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {Link2, Plus, Trash2} from '@lucide/vue'

import type {UserInviteLink} from '@/client/generated'
import {adminInviteLinksQuery, useDeleteInviteLinkMutation} from '@/client/queries/admin'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import InviteLinkDialog from '@/features/admin/InviteLinkDialog.vue'
import {hasExpired} from '@/features/settings/integrations/format'
import NewSecretNotice from '@/features/settings/integrations/NewSecretNotice.vue'
import {useConfigStore} from '@/stores/config'
import {confirm} from '@/ui/confirm'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Links that let people register without public sign-up; each link's secret shows only once. */
defineOptions({inheritAttrs: false})

const {t, n} = useI18n()
const configStore = useConfigStore()
const dates = useTaskDateFormat()
const {now} = useGlobalNow()

const links = useQuery(adminInviteLinksQuery())
const list = computed(() => links.data.value ?? [])
const remove = useDeleteInviteLinkMutation()

const dialogOpen = ref(false)
// The new link, shown this once: nothing else keeps it.
const createdUrl = ref<string | null>(null)

function inviteUrl(token: string): string {
	const base = configStore.frontend_url || new URL(import.meta.env.BASE_URL, window.location.origin).toString()
	return new URL(`register#invite-link=${encodeURIComponent(token)}`, base.endsWith('/') ? base : `${base}/`).toString()
}

function onCreated(link: UserInviteLink) {
	createdUrl.value = link.token ? inviteUrl(link.token) : null
}

// Used up or past its date: it no longer lets anyone in.
function isSpent(link: UserInviteLink): boolean {
	return hasExpired(link.expires_at ?? undefined, now.value)
		|| (typeof link.max_uses === 'number' && (link.uses ?? 0) >= link.max_uses)
}

async function deleteLink(link: UserInviteLink) {
	if (link.id === undefined) {
		return
	}
	const confirmed = await confirm({
		title: t('admin.invites.deleteTitle', {name: link.name}),
		description: t('admin.invites.deleteDescription'),
		confirmLabel: t('admin.invites.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({id: link.id})
	}
}
</script>

<template>
	<div class="@container mx-auto grid max-w-4xl gap-4 pt-4 pb-10 md:pt-6">
		<div class="flex items-center gap-3 px-4 @2xl:px-6">
			<p class="min-w-0 flex-1 text-sm text-pretty text-ink-muted">
				{{ t('admin.invites.description') }}
			</p>
			<UiButton
				variant="primary"
				:icon="Plus"
				@click="dialogOpen = true"
			>
				{{ t('admin.invites.new') }}
			</UiButton>
		</div>

		<div
			v-if="createdUrl"
			class="px-4 @2xl:px-6"
		>
			<NewSecretNotice
				:title="t('admin.invites.created')"
				:value="createdUrl"
				:label="t('admin.invites.url')"
				@done="createdUrl = null"
			/>
		</div>

		<UiAlert
			v-if="links.isError.value"
			tone="danger"
			class="mx-4 @2xl:mx-6"
		>
			{{ t('admin.loadFailed') }}
		</UiAlert>
		<div
			v-else-if="links.isPending.value"
			class="grid gap-4 px-4 pt-2 @2xl:px-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 3"
				:key="index"
				class="h-8"
			/>
		</div>
		<UiEmptyState
			v-else-if="!list.length"
			:title="t('admin.invites.emptyTitle')"
			:description="t('admin.invites.emptyDescription')"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="Link2"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<ul
			v-else
			role="list"
			:aria-label="t('admin.nav.inviteLinks')"
			class="divide-y divide-line border-y border-line"
		>
			<li
				v-for="link in list"
				:key="link.id"
				class="flex min-h-13 items-center gap-3 px-4 py-2 @2xl:px-6 pointer-coarse:min-h-15"
				data-invite-link
			>
				<div class="min-w-0 flex-1">
					<p class="flex min-w-0 items-center gap-2">
						<span
							class="truncate text-base pointer-coarse:text-md"
							:class="isSpent(link) && 'text-ink-muted'"
						>{{ link.name }}</span>
						<UiChip
							v-if="isSpent(link)"
							size="sm"
							class="shrink-0"
						>
							{{ t('admin.invites.spent') }}
						</UiChip>
					</p>
					<p class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-ink-faint">
						<span class="font-mono tabular-nums">{{ t('admin.invites.uses', {uses: n(link.uses ?? 0), max: link.max_uses ? n(link.max_uses) : '∞'}) }}</span>
						<span aria-hidden="true">·</span>
						<span class="font-mono">{{ link.expires_at ? t('admin.invites.expires', {date: dates.short(new Date(link.expires_at))}) : t('admin.invites.neverExpires') }}</span>
						<template v-if="link.teams?.length">
							<span aria-hidden="true">·</span>
							<span class="truncate">{{ link.teams.map(team => team.name).join(', ') }}</span>
						</template>
						<template v-if="link.created_by">
							<span aria-hidden="true">·</span>
							<span class="truncate">{{ t('admin.invites.createdBy', {user: link.created_by.name || link.created_by.username}) }}</span>
						</template>
					</p>
				</div>
				<UiIconButton
					:icon="Trash2"
					:label="t('admin.invites.deleteNamed', {name: link.name})"
					class="shrink-0 text-ink-faint hover:text-danger"
					@click="deleteLink(link)"
				/>
			</li>
		</ul>
	</div>

	<InviteLinkDialog
		v-model:open="dialogOpen"
		@created="onCreated"
	/>
</template>
