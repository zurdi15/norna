<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import UiButton from '@/ui/UiButton.vue'

/** Under a paged admin list: how many are showing, and the next page on demand. */
defineProps<{
	shown: number
	total: number
	hasMore: boolean
	loading: boolean
}>()

const emit = defineEmits<{
	more: []
}>()

const {t, n} = useI18n()
</script>

<template>
	<div class="flex items-center justify-between gap-4 px-4 py-3 @2xl:px-6">
		<p class="font-mono text-2xs text-ink-faint tabular-nums">
			{{ t('admin.shownOf', {shown: n(shown), total: n(total)}) }}
		</p>
		<UiButton
			v-if="hasMore"
			size="sm"
			:loading="loading"
			@click="emit('more')"
		>
			{{ t('admin.loadMore') }}
		</UiButton>
	</div>
</template>
