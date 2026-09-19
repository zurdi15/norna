<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'

import {cn} from './cn'
import UiAvatar, {type UiAvatarSize} from './UiAvatar.vue'

export interface UiAvatarStackPerson {
	id: number | string
	name: string
	src?: string | null
}

const props = withDefaults(defineProps<{
	people: UiAvatarStackPerson[]
	max?: number
	size?: UiAvatarSize
	class?: HTMLAttributes['class']
}>(), {
	max: 3,
	size: 'md',
	class: undefined,
})

const shown = computed(() => props.people.slice(0, props.max))
const hidden = computed(() => Math.max(0, props.people.length - props.max))
</script>

<template>
	<span :class="cn('inline-flex items-center -space-x-1.5', props.class)">
		<UiAvatar
			v-for="person in shown"
			:key="person.id"
			:name="person.name"
			:src="person.src"
			:size="size"
			class="ring-2 ring-surface"
		/>
		<span
			v-if="hidden > 0"
			class="
				relative inline-grid h-6 min-w-6 place-items-center rounded-full bg-canvas-subtle px-1 font-mono
				text-2xs text-ink-muted ring-2 ring-surface
			"
		>+{{ hidden }}</span>
	</span>
</template>
