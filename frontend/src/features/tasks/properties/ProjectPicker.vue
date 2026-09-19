<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {PERMISSIONS} from '@/constants/permissions'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiListbox from '@/ui/UiListbox.vue'

/** Projects a task can move to: real, not archived, and writable. Sub-projects show their parent. */
const emit = defineEmits<{
	select: [projectId: number]
}>()

const projectId = defineModel<number>({default: 0})

const {t} = useI18n()
const projects = useProjects()

// In sidebar order: each project followed by its sub-projects.
function inTreeOrder(roots: readonly ProjectResponse[]): ProjectResponse[] {
	return roots.flatMap(project => [project, ...inTreeOrder(projects.getChildProjects(project.id).filter(child => !child.is_archived))])
}

const items = computed(() => inTreeOrder(projects.notArchivedRootProjects)
	.filter(project => project.id > 0 && (project.max_permission ?? PERMISSIONS.READ_WRITE) >= PERMISSIONS.READ_WRITE)
	.map(project => ({
		id: project.id,
		title: project.title,
		color: project.hex_color,
		path: projects.getAncestors(project).slice(0, -1).map(ancestor => ancestor.title).join(' / '),
	})))

function pick(id: number) {
	projectId.value = id
	emit('select', id)
}
</script>

<template>
	<UiListbox
		:model-value="projectId"
		:items="items"
		:item-key="item => item.id"
		:item-label="item => item.path ? `${item.path} / ${item.title}` : item.title"
		:label="t('taskDetail.properties.project')"
		:search-placeholder="t('taskDetail.searchProject')"
		class="md:w-72"
		@select="pick"
	>
		<template #item="{item}">
			<UiColorDot :color="item.color" />
			<span class="min-w-0 flex-1 truncate">
				<span
					v-if="item.path"
					class="text-ink-faint"
				>{{ item.path }} / </span>{{ item.title }}
			</span>
		</template>
	</UiListbox>
</template>
