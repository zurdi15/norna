<script setup lang="ts">
import type {RouteLocationRaw} from 'vue-router'

import PageHeader from '@/features/shell/PageHeader.vue'
import {useTitle} from '@/composables/useTitle'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'

/**
 * The frame of one settings section. Wide screens show it beside the settings
 * navigation, under the settings header; phones show it as its own screen, with a
 * way back to the list of sections.
 */
const props = withDefaults(defineProps<{
	title: string
	description?: string
	// Where the phone's back button goes: a sub-page (an importer) returns to its section.
	back?: RouteLocationRaw
}>(), {
	description: undefined,
	back: () => ({name: 'user.settings'}),
})

const {isMd} = useBreakpoints()
useTitle(() => props.title)
</script>

<template>
	<PageHeader
		v-if="!isMd"
		:title="title"
		:back="back"
	>
		<template #actions>
			<slot name="actions" />
		</template>
	</PageHeader>
	<div class="grid gap-8 px-4 py-6 md:p-0">
		<header
			v-if="isMd || description"
			class="flex items-start gap-4"
		>
			<div class="min-w-0 flex-1">
				<h2
					v-if="isMd"
					class="text-xl font-semibold tracking-tight"
				>
					{{ title }}
				</h2>
				<p
					v-if="description"
					class="mt-1 text-sm text-pretty text-ink-muted"
				>
					{{ description }}
				</p>
			</div>
			<div
				v-if="isMd && $slots.actions"
				class="flex shrink-0 items-center gap-2"
			>
				<slot name="actions" />
			</div>
		</header>
		<slot />
	</div>
</template>
