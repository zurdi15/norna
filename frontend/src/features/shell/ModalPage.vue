<script setup lang="ts">
import {onBeforeUnmount, watch} from 'vue'
import type {RouteLocationRaw} from 'vue-router'

import {useShellStore} from '@/stores/shell'

import PageHeader from './PageHeader.vue'

/**
 * The frame of a dialog route (settings, create forms). Over its backdrop the shell's
 * dialog already has the title, so this only lays out the content and the actions;
 * opened on its own (a direct link) it becomes a page with a header and a way back.
 */
const props = withDefaults(defineProps<{
	title: string
	inModal?: boolean
	back?: RouteLocationRaw | boolean
}>(), {
	inModal: false,
	back: true,
})

// In a dialog, the title shows in the dialog's own header.
const shell = useShellStore()
watch(() => props.inModal ? props.title : '', title => shell.dialogTitle = title, {immediate: true})
onBeforeUnmount(() => {
	if (props.inModal) {
		shell.dialogTitle = ''
	}
})
</script>

<template>
	<template v-if="inModal">
		<div class="grid gap-5">
			<slot />
			<div
				v-if="$slots.actions"
				class="flex flex-wrap items-center justify-end gap-2 pt-1"
			>
				<slot name="actions" />
			</div>
		</div>
	</template>
	<template v-else>
		<PageHeader
			:title="title"
			:back="back"
		/>
		<div class="mx-auto grid max-w-xl gap-5 px-4 py-6 md:px-6">
			<slot />
			<div
				v-if="$slots.actions"
				class="flex flex-wrap items-center justify-end gap-2 pt-1"
			>
				<slot name="actions" />
			</div>
		</div>
	</template>
</template>
