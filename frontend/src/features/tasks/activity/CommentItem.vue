<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Ellipsis, Link, Pencil, Trash2} from '@lucide/vue'

import type {TaskComment} from '@/client/generated'
import {PRIMARY_MODIFIER_KEY} from '@/constants/shortcuts'
import {useDeleteCommentMutation, useUpdateCommentMutation} from '@/client/queries/taskComments'
import TaskEditor from '@/features/editor/TaskEditor.vue'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {formatDateSince, formatDisplayDate} from '@/helpers/time/formatDate'
import {error, success} from '@/message'
import {getDisplayName} from '@/modules/user/displayName'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import type {UiMenuEntry} from '@/ui/menu'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import ReactionBar from './ReactionBar.vue'

/** One comment: who and when, the text, and its reactions. Authors can edit or delete their own. */
const props = defineProps<{
	comment: TaskComment
	taskId: number
	// Whether the viewer may comment and react at all.
	editable: boolean
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const update = useUpdateCommentMutation()
const remove = useDeleteCommentMutation()

const editing = ref(false)
const draft = ref('')
const isAuthor = computed(() => props.editable && props.comment.author?.id === authStore.info?.id)
// A comment the server stamped a moment ahead of this clock still reads "a few seconds ago".
const createdAt = computed(() => {
	const created = props.comment.created ? new Date(props.comment.created) : new Date()
	return new Date(Math.min(created.getTime(), Date.now()))
})
const edited = computed(() => props.comment.updated && props.comment.created
	&& new Date(props.comment.updated).getTime() - new Date(props.comment.created).getTime() > 1000)

function startEditing() {
	draft.value = props.comment.comment ?? ''
	editing.value = true
}

function saveEdit(value: string) {
	editing.value = false
	if (props.comment.id !== undefined && value !== props.comment.comment) {
		update.mutate({taskId: props.taskId, commentId: props.comment.id, comment: value})
	}
}

async function deleteComment() {
	if (props.comment.id === undefined) {
		return
	}
	const confirmed = await confirm({
		title: t('taskDetail.comments.deleteTitle'),
		description: t('taskDetail.comments.deleteDescription'),
		confirmLabel: t('taskDetail.comments.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({taskId: props.taskId, commentId: props.comment.id})
	}
}

async function copyLink() {
	const url = new URL(window.location.href)
	url.hash = `comment-${props.comment.id}`
	try {
		await navigator.clipboard.writeText(url.href)
		success({message: t('tasks.actions.linkCopied')})
	} catch (cause) {
		error(cause)
	}
}

const menuItems = computed<UiMenuEntry[]>(() => [
	...(isAuthor.value ? [
		{label: t('taskDetail.comments.edit'), icon: Pencil, onSelect: startEditing},
	] : []),
	{label: t('taskDetail.comments.copyLink'), icon: Link, onSelect: () => void copyLink()},
	...(isAuthor.value ? [
		{type: 'separator' as const},
		{label: t('taskDetail.comments.delete'), icon: Trash2, tone: 'danger' as const, onSelect: () => void deleteComment()},
	] : []),
])
</script>

<template>
	<article
		:id="`comment-${comment.id}`"
		class="group/comment flex scroll-mt-20 gap-3"
	>
		<UserAvatar
			:username="comment.author?.username"
			:name="comment.author?.name"
			size="sm"
			class="mt-0.5"
		/>
		<div class="min-w-0 flex-1">
			<header class="flex min-h-7 items-center gap-2">
				<span class="truncate text-sm font-medium">{{ getDisplayName(comment.author) }}</span>
				<time
					:datetime="comment.created"
					:title="formatDisplayDate(comment.created)"
					class="shrink-0 font-mono text-2xs text-ink-faint"
				>{{ formatDateSince(createdAt) }}</time>
				<span
					v-if="edited"
					class="shrink-0 font-mono text-2xs text-ink-faint"
				>· {{ t('taskDetail.comments.edited') }}</span>
				<UiMenu
					:items="menuItems"
					:title="t('taskDetail.comments.actions')"
				>
					<template #trigger>
						<UiIconButton
							:icon="Ellipsis"
							:label="t('taskDetail.comments.actions')"
							size="sm"
							class="
								ms-auto opacity-0
								group-hover/comment:opacity-100
								focus-visible:opacity-100
								data-[state=open]:opacity-100
								pointer-coarse:opacity-100
							"
						/>
					</template>
				</UiMenu>
			</header>
			<TaskEditor
				v-if="editing"
				v-model="draft"
				:task-id="taskId"
				variant="comment"
				editable
				autofocus
				@save="(value, trigger) => trigger === 'shortcut' && saveEdit(value)"
				@cancel="editing = false"
			/>
			<TaskEditor
				v-else
				:model-value="comment.comment ?? ''"
				:task-id="taskId"
				variant="comment"
				:editable="false"
				:checkable="false"
			/>
			<p
				v-if="editing"
				class="mt-1 font-mono text-2xs text-ink-faint"
			>
				{{ t('taskDetail.comments.editHint', {mod: PRIMARY_MODIFIER_KEY}) }}
			</p>
			<ReactionBar
				v-if="comment.id !== undefined && (editable || Object.keys(comment.reactions ?? {}).length)"
				:target="{kind: 'comments', taskId, commentId: comment.id}"
				:reactions="comment.reactions"
				:editable="editable"
				class="mt-1.5"
			/>
		</div>
	</article>
</template>
