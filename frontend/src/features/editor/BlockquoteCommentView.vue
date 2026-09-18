<script setup lang="ts">
import {computed, inject} from 'vue'
import {useI18n} from 'vue-i18n'
import {nodeViewProps, NodeViewContent, NodeViewWrapper} from '@tiptap/vue-3'
import {ArrowUp} from '@lucide/vue'

import UserAvatar from '@/features/shell/UserAvatar.vue'
import {getDisplayName} from '@/modules/user/displayName'
import UiIconButton from '@/ui/UiIconButton.vue'

import {commentReplyContextKey} from './commentReplyContext'

const props = defineProps(nodeViewProps)

const {t} = useI18n()

// Only the comment thread provides this; elsewhere the quote renders plain.
const ctx = inject(commentReplyContextKey, null)

const commentId = computed<number | null>(() => {
	const id = Number(props.node.attrs.commentId ?? Number.NaN)
	return Number.isInteger(id) && id > 0 ? id : null
})

const parent = computed(() => commentId.value === null || !ctx ? undefined : ctx.findComment(commentId.value))
const authorName = computed(() => getDisplayName(parent.value?.author))

function jump() {
	if (commentId.value !== null) {
		ctx?.scrollToComment(commentId.value)
	}
}
</script>

<template>
	<NodeViewWrapper
		as="blockquote"
		:data-comment-id="commentId === null ? undefined : String(commentId)"
	>
		<div
			v-if="commentId !== null && ctx"
			contenteditable="false"
			class="mb-1 flex min-h-7 items-center gap-2 text-sm text-ink-muted not-italic select-none"
		>
			<template v-if="parent">
				<UserAvatar
					:username="parent.author?.username"
					:name="authorName"
					size="sm"
				/>
				<span class="min-w-0 truncate font-medium text-ink">{{ authorName }}</span>
				<UiIconButton
					:icon="ArrowUp"
					:label="t('task.comment.jumpToOriginal')"
					size="sm"
					class="-my-1"
					@click="jump"
				/>
			</template>
			<span
				v-else
				class="text-ink-faint italic"
			>{{ t('task.comment.deletedComment') }}</span>
		</div>
		<NodeViewContent />
	</NodeViewWrapper>
</template>
