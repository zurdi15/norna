<script setup lang="ts">
import type {Label} from '@/client/generated'
import UiChip from '@/ui/UiChip.vue'

/** A task's featured labels as small chips, before its title wherever the task shows up. */
defineProps<{
	labels: readonly Label[]
}>()
</script>

<template>
	<span
		v-if="labels.length"
		class="inline-flex shrink-0 gap-1"
	>
		<UiChip
			v-for="label in labels"
			:key="label.id"
			size="sm"
			:color="label.hex_color"
			class="max-w-28"
		>
			{{ label.title }}
		</UiChip>
	</span>
</template>
