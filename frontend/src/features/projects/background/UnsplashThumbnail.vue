<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {useObjectUrl} from '@vueuse/core'
import {Check} from '@lucide/vue'

import {unsplashAuthor, unsplashBackgroundThumbnailQuery} from '@/client/queries/projectBackgrounds'
import {useBlurHashUrl} from '@/composables/useBlurHashUrl'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import {unsplashProfileUrl, type UnsplashImage} from './useBackgroundSettings'

/** One search result: the blur hash first, the thumbnail over it, the photographer below. */
const props = withDefaults(defineProps<{
	image: UnsplashImage
	current?: boolean
	pending?: boolean
}>(), {
	current: false,
	pending: false,
})

const emit = defineEmits<{
	select: []
}>()

const {t} = useI18n()
const author = computed(() => unsplashAuthor(props.image.info))

// The API proxies thumbnails, so the image never loads from Unsplash in the browser.
const thumb = useQuery(computed(() => unsplashBackgroundThumbnailQuery(props.image.id)))
const thumbUrl = useObjectUrl(thumb.data)
const blurHashUrl = useBlurHashUrl(() => props.image.blur_hash ?? '')
</script>

<template>
	<figure class="grid min-w-0 gap-1">
		<button
			type="button"
			:aria-label="author ? t('projectBackground.useBy', {author: author.author_name}) : t('projectBackground.use')"
			:aria-pressed="current"
			:aria-busy="pending || undefined"
			class="
				relative aspect-16/10 cursor-pointer overflow-hidden rounded-md bg-canvas-subtle bg-cover bg-center
				ring-offset-2 ring-offset-surface-raised outline-none
				focus-visible:ring-2 focus-visible:ring-accent
				aria-pressed:ring-2 aria-pressed:ring-accent
			"
			:style="blurHashUrl ? {backgroundImage: `url(${blurHashUrl})`} : undefined"
			@click="emit('select')"
		>
			<img
				v-if="thumbUrl"
				:src="thumbUrl"
				alt=""
				class="size-full animate-fade-in object-cover transition-transform duration-200 hover:scale-103"
			>
			<span
				v-if="pending"
				class="absolute inset-0 grid place-items-center bg-surface/70 text-accent backdrop-blur-xs"
			>
				<UiSpinner class="size-5" />
			</span>
			<span
				v-else-if="current"
				class="
					absolute inset-e-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-on-accent
					shadow-raised
				"
			>
				<UiIcon
					:icon="Check"
					size="xs"
					:stroke="3"
				/>
			</span>
		</button>
		<figcaption
			v-if="author"
			class="truncate text-2xs text-ink-faint"
		>
			<a
				:href="unsplashProfileUrl(author.author)"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-ink hover:underline"
			>{{ author.author_name }}</a>
		</figcaption>
	</figure>
</template>
