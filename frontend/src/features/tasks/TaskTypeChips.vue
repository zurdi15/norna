<script setup lang="ts">
import type {Label} from '@/client/generated'
import UiChip from '@/ui/UiChip.vue'

/** A task's type labels as small chips, before its title in lists and on cards. */
defineProps<{
	types: readonly Label[]
}>()
</script>

<template>
	<span
		v-if="types.length"
		class="inline-flex shrink-0 gap-1"
	>
		<UiChip
			v-for="type in types"
			:key="type.id"
			size="sm"
			:color="type.hex_color"
			class="max-w-28"
		>
			{{ type.title }}
		</UiChip>
	</span>
</template>
