<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {AvatarFallback, AvatarImage, AvatarRoot} from 'reka-ui'

import {cn} from './cn'

export type UiAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const props = withDefaults(defineProps<{
	name: string
	src?: string | null
	size?: UiAvatarSize
	class?: HTMLAttributes['class']
}>(), {
	src: undefined,
	size: 'md',
	class: undefined,
})

const SIZES: Record<UiAvatarSize, string> = {
	xs: 'size-4 text-3xs',
	sm: 'size-5 text-3xs',
	md: 'size-6 text-2xs',
	lg: 'size-8 text-xs',
	xl: 'size-12 text-base',
	'2xl': 'size-16 text-2xl',
}

const initials = computed(() => props.name
	.trim()
	.split(/\s+/)
	.slice(0, 2)
	.map(word => word.charAt(0).toUpperCase())
	.join(''))
</script>

<template>
	<AvatarRoot :class="cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle', SIZES[size], props.class)">
		<AvatarImage
			v-if="src"
			:src="src"
			:alt="name"
			class="size-full object-cover"
		/>
		<AvatarFallback
			class="font-semibold text-accent"
			:aria-label="name"
		>
			{{ initials }}
		</AvatarFallback>
	</AvatarRoot>
</template>
