<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Download, Ellipsis, File, FileAudio, FileText, FileVideo, ImageOff, ImageUp, Maximize2, Trash2} from '@lucide/vue'

import type {TaskAttachment} from '@/client/generated'
import {getHumanSize} from '@/helpers/getHumanSize'
import {attachmentExtension, attachmentKind} from '@/modules/task/attachmentKind'
import {cn} from '@/ui/cn'
import type {UiMenuEntry} from '@/ui/menu'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {useAttachmentUrl} from './useAttachmentUrl'

/** One attachment in the grid: a thumbnail for images, the file type for everything else. */
const props = defineProps<{
	attachment: TaskAttachment
	isCover: boolean
	editable: boolean
}>()

const emit = defineEmits<{
	open: []
	download: []
	toggleCover: []
	remove: []
}>()

const {t} = useI18n()

const kind = computed(() => attachmentKind(props.attachment))
const {url: thumbnail} = useAttachmentUrl(() => kind.value === 'image' ? props.attachment : undefined, 'md')
const name = computed(() => props.attachment.file?.name ?? '')
const size = computed(() => props.attachment.file?.size ? getHumanSize(props.attachment.file.size) : '')

const ICONS = {image: File, pdf: FileText, video: FileVideo, audio: FileAudio, file: File} as const

const menuItems = computed<UiMenuEntry[]>(() => [
	...(kind.value !== 'file' ? [{label: t('taskDetail.attachments.open'), icon: Maximize2, onSelect: () => emit('open')}] : []),
	{label: t('taskDetail.attachments.download'), icon: Download, onSelect: () => emit('download')},
	...(props.editable && kind.value === 'image' ? [{
		label: props.isCover ? t('taskDetail.attachments.removeCover') : t('taskDetail.attachments.setCover'),
		icon: props.isCover ? ImageOff : ImageUp,
		onSelect: () => emit('toggleCover'),
	}] : []),
	...(props.editable ? [
		{type: 'separator' as const},
		{label: t('taskDetail.attachments.delete'), icon: Trash2, tone: 'danger' as const, onSelect: () => emit('remove')},
	] : []),
])

function activate() {
	if (kind.value === 'file') {
		emit('download')
	} else {
		emit('open')
	}
}
</script>

<template>
	<div class="group/tile relative">
		<button
			type="button"
			:class="cn(
				`
					relative grid aspect-4/3 w-full cursor-pointer overflow-hidden rounded-md border border-line
					bg-canvas-subtle text-start
				`,
				'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
			)"
			:aria-label="kind === 'file' ? t('taskDetail.attachments.downloadNamed', {name}) : t('taskDetail.attachments.openNamed', {name})"
			@click="activate"
		>
			<img
				v-if="thumbnail"
				:src="thumbnail"
				alt=""
				class="absolute inset-0 size-full object-cover"
			>
			<span
				v-else
				class="flex flex-col items-start justify-between p-2"
			>
				<UiIcon
					:icon="ICONS[kind]"
					size="lg"
					class="text-ink-faint"
				/>
				<span class="font-mono text-2xs text-ink-faint">{{ attachmentExtension(attachment) }}</span>
			</span>
			<span
				v-if="isCover"
				class="
					absolute inset-s-1.5 top-1.5 rounded-sm bg-canvas/85 px-1.5 py-0.5 font-mono text-3xs tracking-wide
					text-ink uppercase backdrop-blur-sm
				"
			>{{ t('taskDetail.attachments.cover') }}</span>
		</button>
		<p class="mt-1 truncate text-xs text-ink-muted">
			{{ name }}
		</p>
		<p class="font-mono text-3xs text-ink-faint">
			{{ size }}
		</p>
		<UiMenu
			:items="menuItems"
			:title="name"
		>
			<template #trigger>
				<UiIconButton
					:icon="Ellipsis"
					:label="t('taskDetail.attachments.actions', {name})"
					size="sm"
					variant="secondary"
					class="
						absolute inset-e-1.5 top-1.5 opacity-0
						group-hover/tile:opacity-100
						focus-visible:opacity-100
						data-[state=open]:opacity-100
						pointer-coarse:opacity-100
					"
				/>
			</template>
		</UiMenu>
	</div>
</template>
