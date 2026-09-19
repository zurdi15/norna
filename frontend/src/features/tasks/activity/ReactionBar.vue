<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {SmilePlus} from '@lucide/vue'

import {
	useAddReactionMutation,
	useRemoveReactionMutation,
	type ReactionMap,
	type ReactionTarget,
} from '@/client/queries/reactions'
import {filterEmojis, loadEmojis, type EmojiEntry} from '@/features/editor/emoji/emojiData'
import {getDisplayName} from '@/modules/user/displayName'
import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

/** Emoji reactions on a task or a comment: tap one to join it, or add another. */
const props = defineProps<{
	target: ReactionTarget
	reactions: ReactionMap | undefined
	editable: boolean
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const add = useAddReactionMutation()
const remove = useRemoveReactionMutation()

const QUICK = ['👍', '❤️', '🎉', '😄', '👀', '🚀', '✅', '🙏']

const myId = computed(() => authStore.info?.id)
const entries = computed(() => Object.entries(props.reactions ?? {})
	.map(([value, users]) => [value, users ?? []] as const)
	.filter(([, users]) => users.length > 0)
	.map(([value, users]) => ({
		value,
		count: users.length,
		mine: users.some(user => user.id === myId.value),
		names: users.map(user => getDisplayName(user)).join(', '),
	})))

function toggle(value: string) {
	const mine = entries.value.find(entry => entry.value === value)?.mine
	if (mine && myId.value !== undefined) {
		remove.mutate({target: props.target, value, userId: myId.value})
	} else {
		add.mutate({target: props.target, value})
	}
}

const pickerOpen = ref(false)
const search = ref('')
const index = ref<EmojiEntry[]>([])
watch(pickerOpen, async open => {
	search.value = ''
	if (open && index.value.length === 0) {
		index.value = await loadEmojis().catch(() => [])
	}
})
const results = computed(() => search.value.trim() ? filterEmojis(index.value, search.value) : [])

function pick(value: string) {
	pickerOpen.value = false
	if (!entries.value.some(entry => entry.value === value && entry.mine)) {
		add.mutate({target: props.target, value})
	}
}

const emojiButton = 'grid size-9 cursor-pointer place-items-center rounded-md text-xl hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:size-11'
</script>

<template>
	<div
		v-if="entries.length || editable"
		class="flex flex-wrap items-center gap-1.5"
	>
		<button
			v-for="entry in entries"
			:key="entry.value"
			type="button"
			:disabled="!editable"
			:aria-pressed="entry.mine"
			:aria-label="t('taskDetail.reactions.toggle', {emoji: entry.value, count: entry.count, names: entry.names})"
			:title="entry.names"
			:class="cn(
				'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-sm transition-colors',
				'disabled:cursor-default pointer-coarse:h-9',
				entry.mine ? 'border-accent-line bg-accent-subtle' : 'border-line bg-surface hover:bg-canvas-subtle',
			)"
			@click="toggle(entry.value)"
		>
			<span class="text-base leading-none">{{ entry.value }}</span>
			<span class="font-mono text-2xs text-ink-muted tabular-nums">{{ entry.count }}</span>
		</button>
		<UiAdaptivePopover
			v-if="editable"
			v-model:open="pickerOpen"
			:title="t('taskDetail.reactions.add')"
			class="w-72"
		>
			<template #trigger>
				<UiIconButton
					:icon="SmilePlus"
					:label="t('taskDetail.reactions.add')"
					size="sm"
					class="text-ink-faint"
				/>
			</template>
			<div class="grid gap-2 p-2">
				<div class="flex flex-wrap">
					<button
						v-for="emoji in QUICK"
						:key="emoji"
						type="button"
						:class="emojiButton"
						:aria-label="emoji"
						@click="pick(emoji)"
					>
						{{ emoji }}
					</button>
				</div>
				<input
					v-model="search"
					type="search"
					data-autofocus
					:aria-label="t('taskDetail.reactions.search')"
					:placeholder="t('taskDetail.reactions.search')"
					class="
						h-9 rounded-md border border-line bg-surface px-2.5 text-base
						placeholder:text-ink-faint
						focus:border-accent focus:outline-none
						pointer-coarse:h-11 pointer-coarse:text-lg
					"
				>
				<div
					v-if="results.length"
					class="flex flex-wrap"
				>
					<button
						v-for="result in results"
						:key="result.shortcode"
						type="button"
						:class="emojiButton"
						:title="`:${result.shortcode}:`"
						:aria-label="result.annotation"
						@click="pick(result.emoji)"
					>
						{{ result.emoji }}
					</button>
				</div>
			</div>
		</UiAdaptivePopover>
	</div>
</template>
