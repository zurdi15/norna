<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Check, CheckCheck} from '@lucide/vue'

import type {Task} from '@/client/generated'
import type {BoardBucket} from '@/client/queries/taskBoard'
import {cn} from '@/ui/cn'
import UiDialog from '@/ui/UiDialog.vue'
import UiIcon from '@/ui/UiIcon.vue'

import {bucketCountLabel, canDropInBucket, isDoneBucket} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** "Move to…": the phone's way to change a card's column, and the keyboard's on wide screens. */
const props = defineProps<{
	task: Task | null
	bucketId: number
}>()

const emit = defineEmits<{
	select: [bucket: BoardBucket]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const board = useKanbanBoard()

const options = computed(() => board.buckets.value.map(bucket => ({
	bucket,
	current: bucket.id === props.bucketId,
	allowed: canDropInBucket(board.mode.value, bucket, props.bucketId),
	done: isDoneBucket(board.view.value, bucket.id),
})))

function pick(option: typeof options.value[number]) {
	if (!option.allowed) {
		return
	}
	open.value = false
	if (!option.current) {
		emit('select', option.bucket)
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('kanban.moveToTitle')"
		:description="task?.title"
		size="sm"
		body-class="px-0 pb-2 md:px-2"
	>
		<ul
			role="list"
			class="grid"
		>
			<li
				v-for="option in options"
				:key="option.bucket.id"
			>
				<button
					type="button"
					:aria-current="option.current || undefined"
					:aria-disabled="!option.allowed || undefined"
					:class="cn(
						'flex h-12 w-full cursor-pointer items-center gap-3 px-5 text-start text-md text-ink',
						'active:bg-canvas-subtle md:h-9 md:rounded-md md:px-3 md:text-base md:hover:bg-canvas-subtle',
						'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
					)"
					@click="pick(option)"
				>
					<span class="min-w-0 flex-1 truncate">{{ option.bucket.title }}</span>
					<UiIcon
						v-if="option.done"
						:icon="CheckCheck"
						:label="t('kanban.doneColumn')"
						size="sm"
						class="text-success"
					/>
					<span
						v-if="!option.allowed"
						class="font-mono text-2xs text-warning"
					>{{ t('kanban.full') }}</span>
					<span class="min-w-8 text-end font-mono text-2xs text-ink-faint tabular-nums">{{ bucketCountLabel(option.bucket) }}</span>
					<span class="grid w-5 place-items-center">
						<UiIcon
							v-if="option.current"
							:icon="Check"
							class="text-accent"
						/>
					</span>
				</button>
			</li>
		</ul>
	</UiDialog>
</template>
