<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import NornaMark from '@/features/shell/NornaMark.vue'
import {useConfigStore} from '@/stores/config'
import UiThreads from '@/ui/UiThreads.vue'

// The frame of every signed-out screen: brand, one column of content, legal links.
withDefaults(defineProps<{
	title: string
	description?: string
	caption?: string
}>(), {
	description: undefined,
	caption: undefined,
})

const {t} = useI18n()
const configStore = useConfigStore()
const legal = computed(() => configStore.legal)
</script>

<template>
	<div class="grid min-h-dvh grid-rows-[1fr_auto] px-4 pt-safe pb-safe">
		<main class="mx-auto flex w-full max-w-sm flex-col justify-center py-10">
			<div class="mb-10 flex items-center gap-3">
				<NornaMark class="size-8 rounded-lg" />
				<span class="text-xl font-semibold tracking-tight">Norna</span>
				<UiThreads class="ms-auto h-8 w-18 opacity-70" />
			</div>
			<p
				v-if="caption"
				class="mb-1.5 caption"
			>
				{{ caption }}
			</p>
			<h1 class="text-2xl font-semibold tracking-tight text-balance">
				{{ title }}
			</h1>
			<p
				v-if="description"
				class="mt-2 text-pretty text-ink-muted"
			>
				{{ description }}
			</p>
			<div class="mt-7">
				<slot />
			</div>
		</main>
		<footer
			v-if="legal.imprint_url || legal.privacy_policy_url"
			class="flex justify-center gap-5 py-4 text-xs text-ink-faint"
		>
			<a
				v-if="legal.imprint_url"
				:href="legal.imprint_url"
				rel="noreferrer noopener nofollow"
				target="_blank"
				class="hover:text-ink"
			>{{ t('auth.imprint') }}</a>
			<a
				v-if="legal.privacy_policy_url"
				:href="legal.privacy_policy_url"
				rel="noreferrer noopener nofollow"
				target="_blank"
				class="hover:text-ink"
			>{{ t('auth.privacy') }}</a>
		</footer>
	</div>
</template>
