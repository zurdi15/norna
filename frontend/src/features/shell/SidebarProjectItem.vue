<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronRight} from '@lucide/vue'

import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {useBaseStore} from '@/stores/base'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

import SidebarLink from './SidebarLink.vue'
import {useExpandedProjects} from './useExpandedProjects'

const props = withDefaults(defineProps<{
	project: ProjectResponse
	depth?: number
}>(), {
	depth: 0,
})

const {t} = useI18n()
const projects = useProjects()
const baseStore = useBaseStore()
const {isExpanded, toggle} = useExpandedProjects()

const children = computed(() => projects.getChildProjects(props.project.id).filter(child => !child.is_archived))
const expanded = computed(() => isExpanded(props.project.id))
</script>

<template>
	<li>
		<div
			class="flex items-center gap-0.5"
			:style="{paddingInlineStart: `${depth * 0.75}rem`}"
		>
			<button
				v-if="children.length"
				type="button"
				class="
					grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-faint
					hover:bg-surface hover:text-ink
					pointer-coarse:size-8
				"
				:aria-expanded="expanded"
				:aria-label="t(expanded ? 'shell.collapseProject' : 'shell.expandProject', {project: project.title})"
				@click="toggle(project.id)"
			>
				<UiIcon
					:icon="ChevronRight"
					size="sm"
					:class="cn('transition-transform duration-150', expanded && 'rotate-90')"
				/>
			</button>
			<span
				v-else
				class="w-6 shrink-0 pointer-coarse:w-8"
				aria-hidden="true"
			/>
			<SidebarLink
				:to="{name: 'project.index', params: {projectId: project.id}}"
				:label="project.title"
				:color="project.hex_color"
				:active="baseStore.currentProjectId === project.id"
				class="min-w-0 flex-1"
			/>
		</div>
		<ul
			v-if="expanded && children.length"
			class="grid gap-px"
		>
			<SidebarProjectItem
				v-for="child in children"
				:key="child.id"
				:project="child"
				:depth="depth + 1"
			/>
		</ul>
	</li>
</template>
