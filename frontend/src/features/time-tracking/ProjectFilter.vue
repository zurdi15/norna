<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {FolderKanban} from '@lucide/vue'

import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiChip from '@/ui/UiChip.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiListbox from '@/ui/UiListbox.vue'

/** Narrows the entries to one project (its sub-projects included), or shows them all. */
const projectId = defineModel<number>({required: true})

const {t} = useI18n()
const projects = useProjects()
const open = ref(false)

// In sidebar order: each project followed by its sub-projects.
function inTreeOrder(roots: readonly ProjectResponse[]): ProjectResponse[] {
	return roots.flatMap(project => [project, ...inTreeOrder(projects.getChildProjects(project.id).filter(child => !child.is_archived))])
}

const items = computed(() => [
	{id: 0, title: t('timeTracking.filters.allProjects'), color: '', path: ''},
	...inTreeOrder(projects.notArchivedRootProjects)
		.filter(project => project.id > 0)
		.map(project => ({
			id: project.id,
			title: project.title,
			color: project.hex_color,
			path: projects.getAncestors(project).slice(0, -1).map(ancestor => ancestor.title).join(' / '),
		})),
])

const selected = computed(() => projectId.value > 0 ? projects.projects[projectId.value] : undefined)

function pick(id: number) {
	projectId.value = id
	open.value = false
}
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="t('timeTracking.filters.project')"
	>
		<template #trigger>
			<UiChip
				as="button"
				:pressed="projectId > 0"
				:icon="selected ? undefined : FolderKanban"
				:color="selected?.hex_color"
				class="shrink-0 pointer-coarse:h-10 pointer-coarse:px-3"
			>
				{{ selected?.title ?? t('timeTracking.filters.allProjects') }}
			</UiChip>
		</template>
		<UiListbox
			:model-value="projectId"
			:items="items"
			:item-key="item => item.id"
			:item-label="item => item.path ? `${item.path} / ${item.title}` : item.title"
			:label="t('timeTracking.filters.project')"
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
	</UiAdaptivePopover>
</template>
