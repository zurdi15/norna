<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {PERMISSIONS} from '@/constants/permissions'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiListbox from '@/ui/UiListbox.vue'

/** Where a project sits: at the top, or inside another project that isn't itself or one of its children. */
const props = defineProps<{
	// The project being edited, so it and its descendants aren't offered.
	projectId?: number
}>()

const emit = defineEmits<{
	select: [parentId: number]
}>()

const parentId = defineModel<number>({default: 0})

const {t} = useI18n()
const projects = useProjects()

function descendants(id: number): Set<number> {
	const found = new Set<number>([id])
	for (const child of projects.getChildProjects(id)) {
		for (const nested of descendants(child.id)) {
			found.add(nested)
		}
	}
	return found
}

function inTreeOrder(roots: readonly ProjectResponse[]): ProjectResponse[] {
	return roots.flatMap(project => [project, ...inTreeOrder(projects.getChildProjects(project.id).filter(child => !child.is_archived))])
}

const items = computed(() => {
	const excluded = props.projectId ? descendants(props.projectId) : new Set<number>()
	return [
		{id: 0, title: t('projectSettings.noParent'), color: '', path: ''},
		...inTreeOrder(projects.notArchivedRootProjects)
			.filter(project => project.id > 0 && !excluded.has(project.id)
				&& (project.max_permission ?? PERMISSIONS.READ_WRITE) >= PERMISSIONS.READ_WRITE)
			.map(project => ({
				id: project.id,
				title: project.title,
				color: project.hex_color,
				path: projects.getAncestors(project).slice(0, -1).map(ancestor => ancestor.title).join(' / '),
			})),
	]
})

function pick(id: number) {
	parentId.value = id
	emit('select', id)
}
</script>

<template>
	<UiListbox
		:model-value="parentId"
		:items="items"
		:item-key="item => item.id"
		:item-label="item => item.path ? `${item.path} / ${item.title}` : item.title"
		:label="t('projectSettings.parent')"
		:search-placeholder="t('taskDetail.searchProject')"
		class="md:w-72"
		@select="pick"
	>
		<template #item="{item}">
			<UiColorDot
				v-if="item.id"
				:color="item.color"
			/>
			<span
				class="min-w-0 flex-1 truncate"
				:class="!item.id && 'text-ink-muted'"
			>
				<span
					v-if="item.path"
					class="text-ink-faint"
				>{{ item.path }} / </span>{{ item.title }}
			</span>
		</template>
	</UiListbox>
</template>
