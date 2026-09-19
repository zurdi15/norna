<script setup lang="ts">
import {cn} from '@/ui/cn'
import UiSkeleton from '@/ui/UiSkeleton.vue'

defineProps<{
	inPanel: boolean
}>()
</script>

<template>
	<div
		aria-hidden="true"
		:class="cn('grid gap-3 pt-18', inPanel ? 'px-5' : 'mx-auto max-w-3xl px-4 md:px-6')"
	>
		<div class="flex items-center gap-3">
			<UiSkeleton class="size-5.5 rounded-sm" />
			<UiSkeleton class="h-6 w-3/4" />
		</div>
		<div
			v-for="index in 4"
			:key="index"
			class="flex gap-4 pt-2"
		>
			<UiSkeleton class="h-4 w-24" />
			<UiSkeleton class="h-4 w-40" />
		</div>
		<UiSkeleton class="mt-6 h-24 w-full" />
	</div>
</template>
