<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {Camera, Paperclip} from '@lucide/vue'

import type {TaskAttachment} from '@/client/generated'
import {
	downloadAttachment,
	useDeleteAttachmentMutation,
	useSetCoverImageMutation,
	useUploadAttachmentsMutation,
} from '@/client/queries/taskAttachments'
import type {TaskDetail} from '@/client/queries/tasks'
import {error} from '@/message'
import {useConfigStore} from '@/stores/config'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import DetailSection from '../detail/DetailSection.vue'
import AttachmentTile from './AttachmentTile.vue'
import AttachmentViewer from './AttachmentViewer.vue'

/**
 * The task's files as a grid. Files arrive by the upload button, the camera on
 * phones, or by dropping them anywhere on the section.
 */
const props = defineProps<{
	task: TaskDetail
	editable: boolean
}>()

const {t} = useI18n()
const configStore = useConfigStore()
const {hasFinePointer} = useBreakpoints()
const upload = useUploadAttachmentsMutation()
const remove = useDeleteAttachmentMutation()
const setCover = useSetCoverImageMutation()

const attachments = computed(() => props.task.attachments ?? [])
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const cameraInput = useTemplateRef<HTMLInputElement>('cameraInput')
const viewing = ref<number | null>(null)

// Names of the files on their way up; the client can't report progress, so each just spins.
const uploading = ref<string[]>([])
const dragging = ref(false)
let dragDepth = 0

async function send(files: FileList | File[] | null | undefined) {
	const list = Array.from(files ?? [])
	if (list.length === 0 || props.task.id === undefined) {
		return
	}
	uploading.value = [...uploading.value, ...list.map(file => file.name)]
	try {
		await upload.mutateAsync({taskId: props.task.id, files: list})
	} catch {
		// Reported by the mutation.
	} finally {
		const names = new Set(list.map(file => file.name))
		uploading.value = uploading.value.filter(name => !names.has(name))
	}
}

function onPicked(event: Event) {
	const input = event.target as HTMLInputElement
	void send(input.files)
	// Picking the same file again must fire change.
	input.value = ''
}

function onDragEnter(event: DragEvent) {
	if (!props.editable || !event.dataTransfer?.types.includes('Files')) {
		return
	}
	dragDepth++
	dragging.value = true
}

function onDragLeave() {
	dragDepth = Math.max(0, dragDepth - 1)
	dragging.value = dragDepth > 0
}

function onDrop(event: DragEvent) {
	dragDepth = 0
	dragging.value = false
	if (props.editable) {
		void send(event.dataTransfer?.files)
	}
}

async function download(attachment: TaskAttachment) {
	try {
		await downloadAttachment(attachment)
	} catch (cause) {
		error(cause)
	}
}

function toggleCover(attachment: TaskAttachment) {
	if (props.task.id === undefined || attachment.id === undefined) {
		return
	}
	const isCover = props.task.cover_image_attachment_id === attachment.id
	setCover.mutate({taskId: props.task.id, attachmentId: isCover ? null : attachment.id})
}

defineExpose({
	pick: () => fileInput.value?.click(),
})

async function removeAttachment(attachment: TaskAttachment) {
	if (props.task.id === undefined || attachment.id === undefined) {
		return
	}
	const confirmed = await confirm({
		title: t('taskDetail.attachments.deleteTitle'),
		description: t('taskDetail.attachments.deleteDescription', {name: attachment.file?.name ?? ''}),
		confirmLabel: t('taskDetail.attachments.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({taskId: props.task.id, attachmentId: attachment.id})
	}
}
</script>

<template>
	<DetailSection
		v-if="configStore.task_attachments_enabled && (editable || attachments.length)"
		:title="t('taskDetail.attachments.title')"
		:count="attachments.length || undefined"
		@dragenter.prevent="onDragEnter"
		@dragover.prevent
		@dragleave="onDragLeave"
		@drop.prevent="onDrop"
	>
		<template
			v-if="editable"
			#actions
		>
			<UiButton
				v-if="!hasFinePointer"
				variant="ghost"
				size="sm"
				:icon="Camera"
				class="text-ink-faint"
				@click="cameraInput?.click()"
			>
				{{ t('taskDetail.attachments.camera') }}
			</UiButton>
			<UiButton
				variant="ghost"
				size="sm"
				:icon="Paperclip"
				class="-me-2 text-ink-faint"
				@click="fileInput?.click()"
			>
				{{ t('taskDetail.attachments.upload') }}
			</UiButton>
			<input
				ref="fileInput"
				type="file"
				multiple
				class="hidden"
				@change="onPicked"
			>
			<input
				ref="cameraInput"
				type="file"
				accept="image/*"
				capture="environment"
				class="hidden"
				@change="onPicked"
			>
		</template>

		<div class="relative">
			<div
				v-if="attachments.length || uploading.length"
				class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-2.5 gap-y-3"
			>
				<AttachmentTile
					v-for="attachment in attachments"
					:key="attachment.id"
					:attachment="attachment"
					:is-cover="task.cover_image_attachment_id === attachment.id"
					:editable="editable"
					@open="viewing = attachment.id ?? null"
					@download="download(attachment)"
					@toggleCover="toggleCover(attachment)"
					@remove="removeAttachment(attachment)"
				/>
				<div
					v-for="(name, index) in uploading"
					:key="`${name}-${index}`"
				>
					<div class="grid aspect-4/3 place-items-center rounded-md border border-dashed border-line-strong bg-canvas-subtle">
						<UiSpinner />
					</div>
					<p class="mt-1 truncate text-xs text-ink-faint">
						{{ name }}
					</p>
				</div>
			</div>
			<p
				v-else-if="editable"
				class="rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-ink-faint"
			>
				{{ hasFinePointer ? t('taskDetail.attachments.emptyDrop') : t('taskDetail.attachments.empty') }}
			</p>
			<div
				v-if="dragging"
				class="
					pointer-events-none absolute -inset-2 grid place-items-center rounded-lg border-2 border-dashed
					border-accent bg-accent-subtle/90 text-sm font-medium text-accent
				"
			>
				{{ t('taskDetail.attachments.drop') }}
			</div>
		</div>

		<AttachmentViewer
			v-model="viewing"
			:attachments="attachments"
			@download="download"
		/>
	</DetailSection>
</template>
