<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import UiSkeleton from '@/ui/UiSkeleton.vue'

withDefaults(defineProps<{
	rows?: number
}>(), {
	rows: 6,
})

const {t} = useI18n()

// Varied title widths so the placeholder reads as a list, not a grid.
const WIDTHS = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4', 'w-1/2', 'w-2/3'] as const
</script>

<template>
	<div
		class="grid gap-1 px-4 pt-4"
		role="status"
		:aria-label="t('tasks.list.loading')"
	>
		<UiSkeleton class="mb-2 h-4 w-24" />
		<div
			v-for="index in rows"
			:key="index"
			class="flex items-start gap-3 py-2.5"
		>
			<UiSkeleton class="size-4.5 shrink-0 rounded-sm" />
			<div class="grid flex-1 gap-1.5">
				<UiSkeleton
					class="h-4"
					:class="[WIDTHS[(index - 1) % WIDTHS.length]]"
				/>
				<UiSkeleton class="h-3 w-24" />
			</div>
		</div>
	</div>
</template>
