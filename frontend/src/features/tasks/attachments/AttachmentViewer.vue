<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useEventListener} from '@vueuse/core'
import {ChevronLeft, ChevronRight, Download} from '@lucide/vue'

import type {TaskAttachment} from '@/client/generated'
import {getHumanSize} from '@/helpers/getHumanSize'
import {attachmentKind} from '@/modules/task/attachmentKind'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import {useAttachmentUrl} from './useAttachmentUrl'

/** Shows one previewable attachment at a time; arrows step through the others. */
const props = defineProps<{
	attachments: readonly TaskAttachment[]
}>()

const emit = defineEmits<{
	download: [attachment: TaskAttachment]
}>()

// The id of the attachment on screen; null closes the viewer.
const current = defineModel<number | null>({default: null})

const {t} = useI18n()

const previewable = computed(() => props.attachments.filter(attachment => attachmentKind(attachment) !== 'file'))
const index = computed(() => previewable.value.findIndex(attachment => attachment.id === current.value))
const attachment = computed(() => previewable.value[index.value])
const kind = computed(() => attachment.value ? attachmentKind(attachment.value) : 'file')

// Images come as a large preview; video, audio and PDFs need the original file.
const {url, failed} = useAttachmentUrl(attachment, () => kind.value === 'image' ? 'xl' : undefined)

const open = computed({
	get: () => current.value !== null && attachment.value !== undefined,
	set: isOpen => {
		if (!isOpen) {
			current.value = null
		}
	},
})

function step(offset: number) {
	const count = previewable.value.length
	if (count > 1) {
		current.value = previewable.value[(index.value + offset + count) % count]?.id ?? null
	}
}

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
	if (!open.value || event.target instanceof HTMLMediaElement) {
		return
	}
	if (event.key === 'ArrowRight') {
		step(1)
	} else if (event.key === 'ArrowLeft') {
		step(-1)
	}
})
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="attachment?.file?.name ?? ''"
		size="lg"
		body-class="p-0"
	>
		<div class="grid min-h-60 place-items-center bg-canvas-subtle">
			<UiSpinner v-if="!url && !failed" />
			<p
				v-else-if="failed"
				class="p-8 text-sm text-ink-muted"
			>
				{{ t('taskDetail.attachments.previewFailed') }}
			</p>
			<img
				v-else-if="kind === 'image'"
				:src="url"
				:alt="attachment?.file?.name ?? ''"
				class="max-h-[70dvh] w-auto max-w-full object-contain"
			>
			<video
				v-else-if="kind === 'video'"
				:src="url"
				controls
				class="max-h-[70dvh] w-full"
			/>
			<audio
				v-else-if="kind === 'audio'"
				:src="url"
				controls
				class="m-8 w-full max-w-md"
			/>
			<iframe
				v-else-if="kind === 'pdf'"
				:src="url"
				:title="attachment?.file?.name ?? ''"
				class="h-[70dvh] w-full"
			/>
		</div>
		<template #footer>
			<span class="me-auto font-mono text-2xs text-ink-faint">
				<template v-if="previewable.length > 1">{{ index + 1 }} / {{ previewable.length }} · </template>{{ attachment?.file?.size ? getHumanSize(attachment.file.size) : '' }}
			</span>
			<template v-if="previewable.length > 1">
				<UiIconButton
					:icon="ChevronLeft"
					:label="t('taskDetail.attachments.previous')"
					shortcut="ArrowLeft"
					@click="step(-1)"
				/>
				<UiIconButton
					:icon="ChevronRight"
					:label="t('taskDetail.attachments.next')"
					shortcut="ArrowRight"
					@click="step(1)"
				/>
			</template>
			<UiButton
				:icon="Download"
				@click="attachment && emit('download', attachment)"
			>
				{{ t('taskDetail.attachments.download') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
