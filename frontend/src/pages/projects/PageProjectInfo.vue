<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {useProject} from '@/composables/useProject'
import TaskEditor from '@/features/editor/TaskEditor.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** A project's description, to read. */
const props = withDefaults(defineProps<{
	projectId: number
	inModal?: boolean
}>(), {
	inModal: false,
})

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const {project, isLoaded} = useProject(() => props.projectId)
const title = computed(() => project.value.title || t('projectView.menu.info'))
</script>

<template>
	<ModalPage
		:title="title"
		:in-modal="inModal"
	>
		<UiSkeleton
			v-if="!isLoaded && !project.description"
			class="h-20"
		/>
		<TaskEditor
			v-else-if="project.description"
			:model-value="project.description"
			:editable="false"
			:checkable="false"
		/>
		<p
			v-else
			class="text-ink-muted"
		>
			{{ t('projectView.noDescription') }}
		</p>
	</ModalPage>
</template>
