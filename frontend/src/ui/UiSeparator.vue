<script setup lang="ts">
import type {HTMLAttributes} from 'vue'
import {Separator} from 'reka-ui'

import {cn} from './cn'

const props = withDefaults(defineProps<{
	orientation?: 'horizontal' | 'vertical'
	// Purely visual separators stay out of the accessibility tree.
	decorative?: boolean
	class?: HTMLAttributes['class']
}>(), {
	orientation: 'horizontal',
	decorative: true,
	class: undefined,
})
</script>

<template>
	<Separator
		:orientation="orientation"
		:decorative="decorative"
		:class="cn('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', props.class)"
	/>
</template>
