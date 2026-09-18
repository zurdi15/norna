<script setup lang="ts">
import {computed} from 'vue'
import {nodeViewProps, NodeViewWrapper} from '@tiptap/vue-3'

import UserAvatar from '@/features/shell/UserAvatar.vue'
import {cn} from '@/ui/cn'

const props = defineProps(nodeViewProps)

const username = computed(() => String(props.node.attrs.id ?? ''))
const label = computed(() => String(props.node.attrs.label ?? props.node.attrs.id ?? ''))
</script>

<template>
	<NodeViewWrapper
		as="span"
		:class="cn(
			'mx-px inline-flex max-w-full items-center gap-1 rounded-sm bg-accent-subtle py-px ps-0.5 pe-1.5 align-bottom',
			'leading-tight font-medium text-accent',
			selected && 'outline-2 outline-accent',
		)"
		:data-id="username"
	>
		<UserAvatar
			:username="username"
			:name="label"
			size="xs"
			class="bg-surface"
		/>
		<span class="truncate">{{ label }}</span>
	</NodeViewWrapper>
</template>
