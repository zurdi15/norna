<script setup lang="ts">
import {computed, ref, useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronDown, KeyRound, Trash2} from '@lucide/vue'

import {normalizePermissions, type TokenPermissions} from '@/client/queries/apiTokens'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {formatDateSince, formatDisplayDate} from '@/helpers/time/formatDate'
import {cn} from '@/ui/cn'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import {formatAgo, formatDay, hasExpired, neverExpires} from './format'
import {isFullAccess} from './tokenPermissions'
import type {ListedApiToken} from './useIntegrations'

/** One API token: what it may do, until when, and a way to revoke it. */
const props = withDefaults(defineProps<{
	token: ListedApiToken
	// Every permission on offer, to tell full access and whole groups apart.
	routes?: TokenPermissions
}>(), {
	routes: () => ({}),
})

const emit = defineEmits<{
	remove: []
}>()

// More groups than this collapse into a "+n" chip.
const VISIBLE_GROUPS = 4

const {t, locale} = useI18n()
const {now} = useGlobalNow()
const detailsId = useId()
const showDetails = ref(false)

const permissions = computed(() => normalizePermissions(props.token.permissions))
const groups = computed(() => {
	const order = Object.keys(props.routes)
	return Object.entries(permissions.value)
		.map(([group, list]) => ({group, list, total: props.routes[group]?.length}))
		.sort((a, b) => (order.indexOf(a.group) + 1 || Infinity) - (order.indexOf(b.group) + 1 || Infinity) || a.group.localeCompare(b.group))
})
const fullAccess = computed(() => isFullAccess(permissions.value, props.routes))
const shown = computed(() => groups.value.slice(0, VISIBLE_GROUPS))
const hidden = computed(() => groups.value.slice(VISIBLE_GROUPS))

const expired = computed(() => hasExpired(props.token.expires_at, now.value))
</script>

<template>
	<li class="flex gap-3 py-3">
		<span
			:class="cn(
				'mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm',
				expired ? 'bg-canvas-subtle text-ink-faint' : 'bg-accent-subtle text-accent',
			)"
			aria-hidden="true"
		>
			<UiIcon
				:icon="KeyRound"
				size="xs"
			/>
		</span>
		<div class="grid min-w-0 flex-1 gap-1.5">
			<p
				class="truncate text-base pointer-coarse:text-md"
				:class="expired ? 'text-ink-muted' : 'text-ink'"
			>
				{{ token.title }}
			</p>
			<div class="flex flex-wrap items-center gap-1">
				<ul
					role="list"
					class="contents"
					:aria-label="t('settingsIntegrations.tokens.permissions')"
				>
					<li v-if="fullAccess">
						<UiChip
							tone="accent"
							size="sm"
						>
							{{ t('settingsIntegrations.tokens.presetNames.fullAccess') }}
						</UiChip>
					</li>
					<template v-else>
						<li
							v-for="{group, list, total} in shown"
							:key="group"
						>
							<UiChip
								size="sm"
								class="font-mono"
							>
								{{ group }}<span
									v-if="total && list.length < total"
									class="ms-1 text-ink-faint"
								>{{ list.length }}/{{ total }}</span>
							</UiChip>
						</li>
						<li v-if="hidden.length">
							<UiChip
								size="sm"
								class="font-mono text-ink-muted"
							>
								+{{ hidden.length }}
							</UiChip>
						</li>
					</template>
				</ul>
				<button
					v-if="groups.length"
					type="button"
					class="
						-my-1 inline-flex h-7 cursor-pointer items-center gap-0.5 rounded-sm px-1.5 text-xs
						text-ink-muted
						hover:text-ink
						focus-visible:outline-2 focus-visible:outline-accent
						pointer-coarse:h-9
					"
					:aria-expanded="showDetails"
					:aria-controls="detailsId"
					@click="showDetails = !showDetails"
				>
					{{ t('settingsIntegrations.tokens.details') }}
					<UiIcon
						:icon="ChevronDown"
						size="xs"
						class="transition-transform duration-150"
						:class="showDetails && 'rotate-180'"
					/>
				</button>
			</div>
			<dl
				v-if="showDetails"
				:id="detailsId"
				class="grid gap-1 rounded-md border border-line bg-canvas-subtle px-3 py-2 font-mono text-xs"
			>
				<div
					v-for="{group, list} in groups"
					:key="group"
					class="flex flex-wrap gap-x-2"
				>
					<dt class="text-ink">
						{{ group }}
					</dt>
					<dd class="min-w-0 text-ink-muted">
						{{ list.join(' · ') }}
					</dd>
				</div>
			</dl>
			<p class="flex flex-wrap items-center gap-x-1.5 font-mono text-2xs text-ink-faint">
				<span v-if="neverExpires(token.expires_at)">{{ t('settingsIntegrations.tokens.neverExpires') }}</span>
				<time
					v-else-if="token.expires_at"
					:datetime="token.expires_at"
					:title="formatDisplayDate(token.expires_at)"
					:class="expired && 'text-danger'"
				>{{ expired
					? t('settingsIntegrations.tokens.expired', {ago: formatDateSince(token.expires_at)})
					: t('settingsIntegrations.tokens.expires', {date: formatDay(token.expires_at, locale)}) }}</time>
				<span
					v-if="token.expires_at && token.created"
					aria-hidden="true"
				>·</span>
				<time
					v-if="token.created"
					:datetime="token.created"
					:title="formatDisplayDate(token.created)"
				>{{ t('settingsIntegrations.tokens.createdAgo', {ago: formatAgo(token.created, now)}) }}</time>
			</p>
		</div>
		<UiIconButton
			:icon="Trash2"
			:label="t('settingsIntegrations.tokens.deleteNamed', {title: token.title})"
			class="-me-2 hover:text-danger"
			@click="emit('remove')"
		/>
	</li>
</template>
