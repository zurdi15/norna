<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'

import {cn} from './cn'
import {shortcutToKeycaps} from './kbd'

const props = withDefaults(defineProps<{
	// "Mod+K", "Shift+Delete", "KeyT"…; Mod is ⌘ on Apple devices and Ctrl elsewhere.
	shortcut: string
	class?: HTMLAttributes['class']
}>(), {
	class: undefined,
})

const keycaps = computed(() => shortcutToKeycaps(props.shortcut))
</script>

<template>
	<kbd :class="cn('inline-flex items-center gap-0.5 font-sans', props.class)">
		<span
			v-for="(key, i) in keycaps"
			:key="i"
			class="
				inline-grid min-w-4.5 place-items-center rounded-sm border border-b-2 border-line bg-canvas-subtle px-1
				font-mono text-2xs/4 text-ink-muted
			"
		>{{ key }}</span>
	</kbd>
</template>
