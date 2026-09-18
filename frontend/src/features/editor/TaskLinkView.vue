<script setup lang="ts">
import {nodeViewProps, NodeViewWrapper} from '@tiptap/vue-3'
import {useRoute, useRouter} from 'vue-router'

import TaskLinkPill from './TaskLinkPill.vue'

defineProps(nodeViewProps)

const router = useRouter()
const route = useRoute()

// Opens even while editing: the pill is an atom, so a click has nothing else to do.
function open(taskId: number) {
	router.push({
		name: 'task.detail',
		params: {id: taskId},
		state: {backdropView: route.fullPath},
	})
}
</script>

<template>
	<NodeViewWrapper as="span">
		<TaskLinkPill
			:href="node.attrs.href"
			:selected="selected"
			@open="open"
		/>
	</NodeViewWrapper>
</template>
