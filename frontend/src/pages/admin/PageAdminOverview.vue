<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'

import {adminOverviewQuery} from '@/client/queries/admin'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {formatDateSince} from '@/helpers/time/formatDate'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiChip from '@/ui/UiChip.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** How big the instance is, which version runs, and the license exactly as the server reports it. */
defineOptions({inheritAttrs: false})

const {t, n} = useI18n()
const configStore = useConfigStore()
const dates = useTaskDateFormat()
const overview = useQuery(adminOverviewQuery())

const shares = computed(() => overview.data.value?.shares)
const stats = computed(() => {
	const data = overview.data.value
	if (!data) {
		return []
	}
	return [
		{key: 'users', label: t('admin.overview.users'), value: data.users ?? 0},
		{key: 'projects', label: t('admin.overview.projects'), value: data.projects ?? 0},
		{key: 'tasks', label: t('admin.overview.tasks'), value: data.tasks ?? 0},
		{key: 'teams', label: t('admin.overview.teams'), value: data.teams ?? 0},
		{
			key: 'shares',
			label: t('admin.overview.shares'),
			value: (shares.value?.link_shares ?? 0) + (shares.value?.team_shares ?? 0) + (shares.value?.user_shares ?? 0),
			detail: t('admin.overview.sharesDetail', {
				links: shares.value?.link_shares ?? 0,
				teams: shares.value?.team_shares ?? 0,
				users: shares.value?.user_shares ?? 0,
			}),
		},
	]
})

const license = computed(() => overview.data.value?.license)

// The server sends the zero time for dates it doesn't have.
function knownDate(value: string | undefined): Date | null {
	const date = value ? new Date(value) : null
	return date && !Number.isNaN(date.getTime()) && date.getFullYear() > 1 ? date : null
}
const expiresAt = computed(() => knownDate(license.value?.expires_at))
const validatedAt = computed(() => knownDate(license.value?.validated_at))
</script>

<template>
	<div class="mx-auto grid max-w-4xl gap-8 px-4 py-6 md:px-6">
		<UiAlert
			v-if="overview.isError.value"
			tone="danger"
		>
			{{ t('admin.loadFailed') }}
		</UiAlert>

		<section
			:aria-label="t('admin.overview.counts')"
			class="grid grid-cols-2 gap-3 sm:grid-cols-3"
		>
			<template v-if="overview.isPending.value">
				<UiSkeleton
					v-for="index in 5"
					:key="index"
					class="h-22 rounded-lg"
				/>
			</template>
			<template v-else>
				<div
					v-for="stat in stats"
					:key="stat.key"
					class="grid content-start gap-3 rounded-lg border border-line bg-surface p-4"
				>
					<p class="caption">
						{{ stat.label }}
					</p>
					<div>
						<p class="font-mono text-2xl font-medium tracking-tight tabular-nums">
							{{ n(stat.value) }}
						</p>
						<p
							v-if="stat.detail"
							class="mt-0.5 truncate font-mono text-2xs text-ink-faint"
						>
							{{ stat.detail }}
						</p>
					</div>
				</div>
			</template>
		</section>

		<section class="grid gap-1">
			<UiSectionHeading :title="t('admin.overview.server')" />
			<dl class="grid divide-y divide-line border-y border-line">
				<div class="flex items-baseline justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.version') }}
					</dt>
					<dd class="min-w-0 font-mono text-sm break-all">
						{{ configStore.version || '—' }}
					</dd>
				</div>
			</dl>
		</section>

		<section
			v-if="license"
			class="grid gap-1"
		>
			<UiSectionHeading :title="t('admin.overview.license')" />
			<dl class="grid divide-y divide-line border-y border-line">
				<div class="flex items-center justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.licenseStatus') }}
					</dt>
					<dd>
						<UiChip
							:tone="license.licensed ? 'success' : 'neutral'"
							size="sm"
						>
							{{ license.licensed ? t('admin.overview.licensed') : t('admin.overview.unlicensed') }}
						</UiChip>
					</dd>
				</div>
				<div class="flex items-start justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.features') }}
					</dt>
					<dd class="flex min-w-0 flex-wrap justify-end gap-1.5">
						<UiChip
							v-for="feature in license.features ?? []"
							:key="feature"
							size="sm"
							class="font-mono"
						>
							{{ feature }}
						</UiChip>
						<span
							v-if="!license.features?.length"
							class="text-sm text-ink-faint"
						>—</span>
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.maxUsers') }}
					</dt>
					<dd class="font-mono text-sm tabular-nums">
						{{ license.max_users ? n(license.max_users) : t('admin.overview.unlimited') }}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.validUntil') }}
					</dt>
					<dd class="font-mono text-sm">
						{{ expiresAt ? dates.long(expiresAt) : '—' }}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-6 py-3">
					<dt class="text-base text-ink-muted">
						{{ t('admin.overview.lastVerified') }}
					</dt>
					<dd class="text-end font-mono text-sm">
						{{ validatedAt ? formatDateSince(validatedAt) : t('admin.overview.never') }}
						<span
							v-if="license.last_check_failed"
							class="block text-xs text-danger"
						>{{ t('admin.overview.lastCheckFailed') }}</span>
					</dd>
				</div>
				<div
					v-if="license.instance_id"
					class="flex items-baseline justify-between gap-6 py-3"
				>
					<dt class="shrink-0 text-base text-ink-muted">
						{{ t('admin.overview.instance') }}
					</dt>
					<dd class="min-w-0 font-mono text-xs break-all text-ink-muted select-all">
						{{ license.instance_id }}
					</dd>
				</div>
			</dl>
		</section>
	</div>
</template>
