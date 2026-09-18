<script setup lang="ts">
import {ref} from 'vue'
import {I18nT, useI18n} from 'vue-i18n'
import {ImageOff, ImageUp} from '@lucide/vue'

import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import {UNSPLASH_URL, unsplashProfileUrl} from './useBackgroundSettings'

/** The current background at the project's proportions; an image dropped on it is uploaded. */
const props = withDefaults(defineProps<{
	src?: string
	blurHashUrl?: string
	credit?: {author: string, author_name: string} | null
	busy?: boolean
	droppable?: boolean
}>(), {
	src: undefined,
	blurHashUrl: undefined,
	credit: null,
	busy: false,
	droppable: false,
})

const emit = defineEmits<{
	drop: [file: File]
}>()

const {t} = useI18n()

const dragging = ref(false)
let dragDepth = 0

function hasFiles(event: DragEvent): boolean {
	return event.dataTransfer?.types.includes('Files') ?? false
}

function onDragEnter(event: DragEvent) {
	if (!props.droppable || !hasFiles(event)) {
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
	const file = event.dataTransfer?.files[0]
	if (props.droppable && file?.type.startsWith('image/')) {
		emit('drop', file)
	}
}
</script>

<template>
	<figure class="grid gap-1.5">
		<div
			:class="cn(
				'relative overflow-hidden rounded-lg border bg-canvas-subtle',
				src || blurHashUrl ? 'aspect-video max-h-72 w-full border-line' : 'h-32 border-dashed border-line-strong',
			)"
			:aria-busy="busy || undefined"
			@dragenter.prevent="onDragEnter"
			@dragover.prevent
			@dragleave="onDragLeave"
			@drop.prevent="onDrop"
		>
			<img
				v-if="src || blurHashUrl"
				:src="src || blurHashUrl"
				:alt="t('projectBackground.current')"
				class="size-full animate-fade-in object-cover"
			>
			<div
				v-else
				class="grid size-full place-content-center justify-items-center gap-2 text-center text-ink-faint"
			>
				<UiIcon
					:icon="ImageOff"
					size="lg"
				/>
				<p class="text-sm">
					{{ t('projectBackground.none') }}
				</p>
			</div>
			<div
				v-if="busy"
				class="absolute inset-0 grid place-items-center bg-surface/70 text-accent backdrop-blur-xs"
			>
				<UiSpinner
					class="size-6"
					:label="t('projectBackground.saving')"
				/>
			</div>
			<div
				v-else-if="dragging"
				class="
					absolute inset-2 grid place-content-center justify-items-center gap-2 rounded-md border-2
					border-dashed border-accent bg-surface/85 text-sm font-medium text-accent backdrop-blur-sm
				"
			>
				<UiIcon
					:icon="ImageUp"
					size="lg"
				/>
				{{ t('projectBackground.drop') }}
			</div>
		</div>
		<figcaption
			v-if="credit"
			class="text-xs text-ink-faint"
		>
			<I18nT
				keypath="projectBackground.credit"
				scope="global"
			>
				<template #author>
					<a
						:href="unsplashProfileUrl(credit.author)"
						target="_blank"
						rel="noopener noreferrer"
						class="text-ink-muted hover:text-ink hover:underline"
					>{{ credit.author_name }}</a>
				</template>
				<template #unsplash>
					<a
						:href="UNSPLASH_URL"
						target="_blank"
						rel="noopener noreferrer"
						class="text-ink-muted hover:text-ink hover:underline"
					>Unsplash</a>
				</template>
			</I18nT>
		</figcaption>
	</figure>
</template>
