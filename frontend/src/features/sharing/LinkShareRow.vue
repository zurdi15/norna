<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Check, Copy, Link2, Lock, Trash2} from '@lucide/vue'

import {useCopyFeedback} from '@/composables/useCopyToClipboard'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {formatDateSince, formatDisplayDate} from '@/helpers/time/formatDate'
import {getDisplayName} from '@/modules/user/displayName'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import {usePermissions} from './permissions'
import type {LinkShare} from './useProjectShares'

const props = withDefaults(defineProps<{
	share: LinkShare
	url: string
	removable?: boolean
}>(), {
	removable: false,
})

const emit = defineEmits<{
	remove: []
}>()

// sharing_type 2: the link asks for a password (pkg/models/link_sharing.go).
const WITH_PASSWORD = 2

const {t} = useI18n()
const permissions = usePermissions()

const title = computed(() => props.share.name || t('projectShare.links.unnamed'))
const author = computed(() => props.share.shared_by ? getDisplayName(props.share.shared_by) : '')

// The copy button turns into a check for a moment instead of toasting.
const {copied, copy: copyText} = useCopyFeedback()

function copy() {
	void copyText(props.url)
}
</script>

<template>
	<li class="flex gap-3 py-2.5">
		<span
			class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-accent-subtle text-accent"
			aria-hidden="true"
		>
			<UiIcon
				:icon="Link2"
				size="xs"
			/>
		</span>
		<div class="grid min-w-0 flex-1 gap-1">
			<p
				class="truncate text-base pointer-coarse:text-md"
				:class="!share.name && 'text-ink-muted'"
			>
				{{ title }}
			</p>
			<p
				class="truncate font-mono text-2xs text-ink-faint select-all"
				:title="url"
			>
				{{ url }}
			</p>
			<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
				<span>{{ permissions.labelFor(share.permission) }}</span>
				<span
					v-if="share.sharing_type === WITH_PASSWORD"
					class="inline-flex items-center gap-1"
				>
					<span
						class="text-ink-faint"
						aria-hidden="true"
					>·</span>
					<UiIcon
						:icon="Lock"
						size="xs"
						class="text-ink-faint"
					/>
					{{ t('auth.password') }}
				</span>
				<span
					v-if="author"
					class="inline-flex min-w-0 items-center gap-1"
				>
					<span
						class="text-ink-faint"
						aria-hidden="true"
					>·</span>
					<UserAvatar
						:username="share.shared_by?.username"
						:name="share.shared_by?.name"
						size="xs"
					/>
					<span class="truncate">{{ t('projectShare.links.createdBy', {name: author}) }}</span>
				</span>
				<time
					v-if="share.created"
					:datetime="share.created"
					:title="formatDisplayDate(share.created)"
					class="font-mono text-2xs text-ink-faint"
				>{{ formatDateSince(share.created) }}</time>
			</p>
		</div>
		<div class="-me-2 flex shrink-0 items-start gap-0.5">
			<UiIconButton
				:icon="copied ? Check : Copy"
				:label="copied ? t('tasks.actions.linkCopied') : t('tasks.actions.copyLink')"
				:class="copied && 'text-success hover:text-success'"
				@click="copy"
			/>
			<UiIconButton
				v-if="removable"
				:icon="Trash2"
				:label="t('projectShare.links.delete')"
				class="hover:text-danger"
				@click="emit('remove')"
			/>
		</div>
		<span
			class="sr-only"
			aria-live="polite"
		>{{ copied ? t('tasks.actions.linkCopied') : '' }}</span>
	</li>
</template>
