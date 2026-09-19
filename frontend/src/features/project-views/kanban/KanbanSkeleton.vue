<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import UiSkeleton from '@/ui/UiSkeleton.vue'

const {t} = useI18n()

// Card counts per placeholder column, so the board doesn't look like a grid of equal boxes.
const COLUMNS = [3, 2, 1]
</script>

<template>
	<div
		role="status"
		:aria-label="t('kanban.loading')"
		class="flex min-h-0 flex-1 items-start gap-2.5 overflow-hidden px-4 pt-2 md:gap-3 md:pt-3 lg:px-6"
	>
		<div
			v-for="(cards, column) in COLUMNS"
			:key="column"
			class="grid w-[86vw] shrink-0 gap-2 rounded-lg bg-canvas-subtle p-2 md:w-72"
			aria-hidden="true"
		>
			<UiSkeleton class="mx-1 my-2 h-3.5 w-24 bg-line" />
			<div
				v-for="card in cards"
				:key="card"
				class="grid gap-2.5 rounded-lg border border-line bg-surface p-3"
			>
				<UiSkeleton class="h-2.5 w-10" />
				<UiSkeleton :class="card % 2 ? 'h-3.5 w-4/5' : 'h-3.5 w-3/5'" />
				<UiSkeleton class="h-2.5 w-1/3" />
			</div>
		</div>
	</div>
</template>
