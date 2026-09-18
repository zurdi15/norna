<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Ellipsis, ListChecks, Trash2, Webhook} from '@lucide/vue'

import UserAvatar from '@/features/shell/UserAvatar.vue'
import {formatDateSince, formatDisplayDate} from '@/helpers/time/formatDate'
import {getDisplayName} from '@/modules/user/displayName'
import type {UiMenuEntry} from '@/ui/menu'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import type {ProjectWebhook} from './useProjectWebhooks'
import WebhookEventsEditor from './WebhookEventsEditor.vue'

const props = withDefaults(defineProps<{
	webhook: ProjectWebhook
	// Every event the server offers, to tell "all of them" apart.
	events: string[]
	eventsLoading?: boolean
	editable?: boolean
	editing?: boolean
	saving?: boolean
}>(), {
	eventsLoading: false,
	editable: false,
	editing: false,
	saving: false,
})

const emit = defineEmits<{
	edit: []
	cancel: []
	save: [events: string[]]
	remove: []
}>()

// More than this collapses into a "+n" chip.
const VISIBLE_EVENTS = 5

const {t} = useI18n()

const everything = computed(() => props.events.length > 0 && props.events.every(event => props.webhook.events.includes(event)))
// Sorted like the picker lists them, not in the order they were picked.
const sorted = computed(() => [...props.webhook.events].sort())
const shown = computed(() => sorted.value.slice(0, VISIBLE_EVENTS))
const hidden = computed(() => sorted.value.slice(VISIBLE_EVENTS))
const author = computed(() => props.webhook.created_by ? getDisplayName(props.webhook.created_by) : '')

const menu = computed<UiMenuEntry[]>(() => [
	{label: t('projectWebhooks.editEvents'), icon: ListChecks, onSelect: () => emit('edit')},
	{type: 'separator'},
	{label: t('projectWebhooks.delete'), icon: Trash2, tone: 'danger', onSelect: () => emit('remove')},
])
</script>

<template>
	<li class="flex gap-3 py-3">
		<span
			class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-accent-subtle text-accent"
			aria-hidden="true"
		>
			<UiIcon
				:icon="Webhook"
				size="xs"
			/>
		</span>
		<div class="grid min-w-0 flex-1 gap-2">
			<p class="font-mono text-sm break-all text-ink">
				{{ webhook.target_url }}
			</p>
			<WebhookEventsEditor
				v-if="editing"
				:initial="webhook.events"
				:events="events"
				:events-loading="eventsLoading"
				:saving="saving"
				@save="value => emit('save', value)"
				@cancel="emit('cancel')"
			/>
			<template v-else>
				<ul
					role="list"
					class="flex flex-wrap gap-1"
					:aria-label="t('projectWebhooks.events')"
				>
					<li v-if="everything">
						<UiChip
							tone="accent"
							size="sm"
						>
							{{ t('projectWebhooks.allEvents') }}
						</UiChip>
					</li>
					<template v-else>
						<li
							v-for="event in shown"
							:key="event"
						>
							<UiChip
								size="sm"
								class="font-mono"
							>
								{{ event }}
							</UiChip>
						</li>
						<li v-if="hidden.length">
							<UiChip
								size="sm"
								class="font-mono text-ink-muted"
								:title="hidden.join(', ')"
							>
								+{{ hidden.length }}
							</UiChip>
						</li>
					</template>
				</ul>
				<p
					v-if="author || webhook.created"
					class="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted"
				>
					<template v-if="author">
						<UserAvatar
							:username="webhook.created_by?.username"
							:name="webhook.created_by?.name"
							size="xs"
						/>
						<span class="truncate">{{ author }}</span>
						<span
							class="text-ink-faint"
							aria-hidden="true"
						>·</span>
					</template>
					<time
						v-if="webhook.created"
						:datetime="webhook.created"
						:title="formatDisplayDate(webhook.created)"
						class="shrink-0 font-mono text-2xs text-ink-faint"
					>{{ formatDateSince(webhook.created) }}</time>
				</p>
			</template>
		</div>
		<UiMenu
			v-if="editable && !editing"
			:items="menu"
			:title="webhook.target_url"
		>
			<template #trigger>
				<UiIconButton
					:icon="Ellipsis"
					:label="t('projectWebhooks.actionsFor', {url: webhook.target_url})"
					size="sm"
					class="-me-1 pointer-coarse:size-10"
				/>
			</template>
		</UiMenu>
	</li>
</template>
