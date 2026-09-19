<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {SendHorizontal} from '@lucide/vue'

import {PRIMARY_MODIFIER_KEY} from '@/constants/shortcuts'
import {useCreateCommentMutation} from '@/client/queries/taskComments'
import type {TaskDetail} from '@/client/queries/tasks'
import {useTaskComments} from '@/composables/useTaskComments'
import TaskEditor from '@/features/editor/TaskEditor.vue'
import {isEditorContentEmpty} from '@/helpers/editorContentEmpty'
import {useAuthStore} from '@/stores/auth'
import {useConfigStore} from '@/stores/config'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import DetailSection from '../detail/DetailSection.vue'
import CommentItem from './CommentItem.vue'

/**
 * The conversation on a task. The composer sits where the newest comment goes:
 * below the list when it reads oldest first (the default), above it otherwise.
 */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const configStore = useConfigStore()
const authStore = useAuthStore()
const create = useCreateCommentMutation()

const order = computed(() => authStore.settings.frontend_settings.comment_sort_order)
const {comments, total, hasMore, isPending, isLoadingMore, loadMore} = useTaskComments(() => props.task.id ?? 0, order)

const draft = ref('')
const empty = computed(() => isEditorContentEmpty(draft.value))
// Remounting the composer after a post gives the next comment a clean editor.
const composerKey = ref(0)

async function submit() {
	if (empty.value || props.task.id === undefined || create.isPending.value) {
		return
	}
	try {
		await create.mutateAsync({taskId: props.task.id, comment: draft.value})
		draft.value = ''
		composerKey.value++
	} catch {
		// Reported by the mutation; the draft stays.
	}
}
</script>

<template>
	<DetailSection
		v-if="configStore.task_comments_enabled"
		:title="t('taskDetail.comments.title')"
		:count="total || undefined"
	>
		<div class="grid gap-5">
			<form
				v-if="editable"
				:class="order === 'desc' ? 'order-first' : 'order-last'"
				class="grid gap-2"
				@submit.prevent="submit"
			>
				<TaskEditor
					:key="composerKey"
					v-model="draft"
					:task-id="task.id"
					:placeholder="t('taskDetail.comments.placeholder')"
					variant="comment"
					editable
					@save="(_value, trigger) => trigger === 'shortcut' && submit()"
				/>
				<div class="flex items-center justify-end gap-3">
					<span class="hidden font-mono text-2xs text-ink-faint pointer-fine:inline">{{ t('taskDetail.comments.sendHint', {mod: PRIMARY_MODIFIER_KEY}) }}</span>
					<UiButton
						type="submit"
						variant="primary"
						size="sm"
						:icon="SendHorizontal"
						:disabled="empty"
						:loading="create.isPending.value"
					>
						{{ t('taskDetail.comments.send') }}
					</UiButton>
				</div>
			</form>

			<div
				v-if="isPending"
				class="grid gap-4"
			>
				<div
					v-for="index in 2"
					:key="index"
					class="flex gap-3"
				>
					<UiSkeleton class="size-6 rounded-full" />
					<div class="grid flex-1 gap-2">
						<UiSkeleton class="h-3 w-32" />
						<UiSkeleton class="h-4 w-3/4" />
					</div>
				</div>
			</div>
			<template v-else>
				<CommentItem
					v-for="comment in comments"
					:key="comment.id"
					:comment="comment"
					:task-id="task.id ?? 0"
					:editable="editable"
				/>
				<UiButton
					v-if="hasMore"
					variant="ghost"
					size="sm"
					:loading="isLoadingMore"
					class="justify-self-start"
					@click="loadMore()"
				>
					{{ t('taskDetail.comments.loadMore') }}
				</UiButton>
				<p
					v-if="!comments.length && !editable"
					class="text-sm text-ink-faint"
				>
					{{ t('taskDetail.comments.empty') }}
				</p>
			</template>
		</div>
	</DetailSection>
</template>
