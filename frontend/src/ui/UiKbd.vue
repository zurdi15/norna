<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'

import {cn} from './cn'
import {shortcutToSteps} from './kbd'

const props = withDefaults(defineProps<{
	// "Mod+K", "Shift+Delete", "KeyT", or a sequence like "KeyG KeyO".
	// Mod is ⌘ on Apple devices and Ctrl elsewhere.
	shortcut?: string
	// Already formatted keycaps, one list per step, when there is no binding string.
	steps?: string[][]
	class?: HTMLAttributes['class']
}>(), {
	shortcut: undefined,
	steps: undefined,
	class: undefined,
})

const {t} = useI18n()
// Preformatted steps come in mixed case ("ctrl", "e"); keycaps read as capitals.
const capitalize = (key: string) => key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1)
const keySteps = computed(() => props.steps?.map(step => step.map(capitalize))
	?? (props.shortcut ? shortcutToSteps(props.shortcut) : []))
</script>

<template>
	<kbd :class="cn('inline-flex items-center gap-1 font-sans', props.class)">
		<template
			v-for="(step, s) in keySteps"
			:key="s"
		>
			<span
				v-if="s > 0"
				class="text-2xs text-ink-faint"
			>{{ t('ui.kbd.then') }}</span>
			<span class="inline-flex items-center gap-0.5">
				<span
					v-for="(key, i) in step"
					:key="i"
					class="
						inline-grid min-w-4.5 place-items-center rounded-sm border border-b-2 border-line
						bg-canvas-subtle px-1 font-mono text-2xs/4 text-ink-muted
					"
				>{{ key }}</span>
			</span>
		</template>
	</kbd>
</template>
