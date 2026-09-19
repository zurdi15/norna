<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {refDebounced} from '@vueuse/core'
import {Search} from '@lucide/vue'

import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import {UNSPLASH_URL, useUnsplashSearch} from './useBackgroundSettings'
import UnsplashThumbnail from './UnsplashThumbnail.vue'

/** Photos from Unsplash, searched through the API. With no query it shows a curated set. */
defineProps<{
	// The Unsplash id of the current background, marked in the grid.
	currentId: string | null
	pendingId: string | null
}>()

const emit = defineEmits<{
	select: [imageId: string]
}>()

const {t} = useI18n()
const query = ref('')
const term = refDebounced(query, 300)
const search = useUnsplashSearch(term, true)
</script>

<template>
	<section class="grid gap-3">
		<UiSectionHeading :title="t('projectBackground.unsplash')">
			<template #actions>
				<a
					:href="UNSPLASH_URL"
					target="_blank"
					rel="noopener noreferrer"
					class="font-mono text-2xs text-ink-faint hover:text-ink"
				>{{ t('projectBackground.poweredBy') }}</a>
			</template>
		</UiSectionHeading>
		<UiInput
			v-model="query"
			type="search"
			enterkeyhint="search"
			autocomplete="off"
			:placeholder="t('projectBackground.searchPlaceholder')"
			:aria-label="t('projectBackground.search')"
		>
			<template #leading>
				<UiIcon
					:icon="Search"
					size="sm"
				/>
			</template>
			<template #trailing>
				<UiSpinner
					v-if="search.isFetching.value && !search.isFetchingNextPage.value"
					class="text-ink-faint"
				/>
			</template>
		</UiInput>
		<UiAlert
			v-if="search.isError.value"
			tone="danger"
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				{{ t('projectBackground.searchError') }}
				<UiButton
					size="sm"
					@click="search.refetch()"
				>
					{{ t('projectBackground.retry') }}
				</UiButton>
			</div>
		</UiAlert>
		<div
			v-else-if="search.isPending.value"
			class="grid grid-cols-2 gap-2 sm:grid-cols-3"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="n in 6"
				:key="n"
				class="aspect-16/10 h-auto"
			/>
		</div>
		<template v-else>
			<ul
				v-if="search.images.value.length"
				role="list"
				class="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3"
			>
				<li
					v-for="image in search.images.value"
					:key="image.id"
				>
					<UnsplashThumbnail
						:image="image"
						:current="image.id === currentId"
						:pending="image.id === pendingId"
						@select="emit('select', image.id)"
					/>
				</li>
			</ul>
			<p
				v-else
				class="py-6 text-center text-sm text-ink-faint"
			>
				{{ t('projectBackground.noResults') }}
			</p>
			<UiButton
				v-if="search.hasNextPage.value && search.images.value.length"
				class="justify-self-center"
				:loading="search.isFetchingNextPage.value"
				@click="search.fetchNextPage()"
			>
				{{ t('kanban.loadMore') }}
			</UiButton>
		</template>
	</section>
</template>
