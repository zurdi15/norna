<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {ArrowDownToLine, CheckCheck, Ellipsis, FoldHorizontal, Gauge, Pencil, Trash2} from '@lucide/vue'

import {createProjectViewUpdate, useUpdateProjectViewMutation} from '@/client/queries/projectViews'
import {useDeleteBucketMutation, type BoardBucket} from '@/client/queries/taskBoard'
import {confirm} from '@/ui/confirm'
import type {UiMenuEntry} from '@/ui/menu'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import BucketLimitDialog from './BucketLimitDialog.vue'
import {isDefaultBucket, isDoneBucket} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** The "⋯" of a column header. Renders nothing when the column offers no action. */
const props = defineProps<{
	bucket: BoardBucket
	// Wide screens only: a phone shows one column at a time anyway.
	collapsible: boolean
}>()

const emit = defineEmits<{
	rename: []
	collapse: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const board = useKanbanBoard()
const isCurrentProject = ({projectId}: {projectId: number}) => projectId === board.projectId.value
const updateDone = useUpdateProjectViewMutation(t('kanban.doneColumnSaved'), isCurrentProject)
const updateDefault = useUpdateProjectViewMutation(t('kanban.defaultColumnSaved'), isCurrentProject)
const deleteBucket = useDeleteBucketMutation()

const menuOpen = ref(false)
const limitOpen = ref(false)

const isDone = computed(() => isDoneBucket(board.view.value, props.bucket.id))
const isDefault = computed(() => isDefaultBucket(board.view.value, props.bucket.id))

function updateView(mutation: typeof updateDone, change: {done_bucket_id?: number, default_bucket_id?: number}) {
	mutation.mutate({
		projectId: board.projectId.value,
		viewId: board.viewId.value,
		view: createProjectViewUpdate({...board.view.value, ...change}),
	})
}

async function remove() {
	const confirmed = await confirm({
		title: t('kanban.deleteTitle', {title: props.bucket.title}),
		description: t('kanban.deleteDescription'),
		confirmLabel: t('misc.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		deleteBucket.mutate({projectId: board.projectId.value, viewId: board.viewId.value, bucketId: props.bucket.id})
	}
}

const items = computed<UiMenuEntry[]>(() => {
	const editable: UiMenuEntry[] = board.canEditBuckets.value
		? [
			{label: t('kanban.rename'), icon: Pencil, onSelect: () => emit('rename')},
			{label: t('kanban.setLimit'), icon: Gauge, onSelect: () => limitOpen.value = true},
			{type: 'separator'},
			{
				label: t('kanban.doneColumn'),
				icon: CheckCheck,
				checked: isDone.value,
				onSelect: () => updateView(updateDone, {done_bucket_id: isDone.value ? 0 : props.bucket.id}),
			},
			{
				label: t('kanban.defaultColumn'),
				icon: ArrowDownToLine,
				checked: isDefault.value,
				onSelect: () => updateView(updateDefault, {default_bucket_id: isDefault.value ? 0 : props.bucket.id}),
			},
		]
		: []
	const layout: UiMenuEntry[] = props.collapsible
		? [{label: t('kanban.collapse'), icon: FoldHorizontal, onSelect: () => emit('collapse')}]
		: []
	const destructive: UiMenuEntry[] = board.canEditBuckets.value
		? [{
			label: t('misc.delete'),
			icon: Trash2,
			tone: 'danger',
			// The server keeps at least one column.
			disabled: board.buckets.value.length <= 1,
			onSelect: remove,
		}]
		: []
	return [editable, layout, destructive]
		.filter(group => group.length > 0)
		.flatMap((group, index) => index === 0 ? group : [{type: 'separator'} as const, ...group])
})
</script>

<template>
	<template v-if="items.length">
		<UiMenu
			v-model:open="menuOpen"
			:items="items"
			:title="bucket.title ?? ''"
		>
			<template #trigger>
				<UiIconButton
					:icon="Ellipsis"
					:label="t('kanban.columnOptions', {title: bucket.title})"
					size="sm"
					data-no-drag
					class="pointer-coarse:size-11"
				/>
			</template>
		</UiMenu>
		<BucketLimitDialog
			v-model:open="limitOpen"
			:bucket="bucket"
		/>
	</template>
</template>
