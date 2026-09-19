<script setup lang="ts">
import UiSkeleton from '@/ui/UiSkeleton.vue'

import LoadFailedAlert from './LoadFailedAlert.vue'

/** A list while it loads, when it fails, when it's empty, and otherwise the list itself (default slot). */
defineProps<{
	pending: boolean
	error: boolean
	empty: boolean
	emptyTitle: string
	emptyDescription?: string
}>()

const emit = defineEmits<{
	retry: []
}>()
</script>

<template>
	<div
		v-if="pending"
		class="grid gap-3 py-3"
		aria-hidden="true"
	>
		<UiSkeleton
			v-for="n in 2"
			:key="n"
			class="h-12"
		/>
	</div>
	<LoadFailedAlert
		v-else-if="error"
		class="my-2"
		@retry="emit('retry')"
	/>
	<div
		v-else-if="empty"
		class="rounded-lg border border-dashed border-line px-4 py-6 text-center"
	>
		<p class="text-base font-medium text-ink">
			{{ emptyTitle }}
		</p>
		<p
			v-if="emptyDescription"
			class="mx-auto mt-1 max-w-sm text-sm text-pretty text-ink-muted"
		>
			{{ emptyDescription }}
		</p>
		<div
			v-if="$slots.emptyActions"
			class="mt-4 flex justify-center"
		>
			<slot name="emptyActions" />
		</div>
	</div>
	<slot v-else />
</template>
