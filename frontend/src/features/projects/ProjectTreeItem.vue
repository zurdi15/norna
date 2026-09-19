<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Archive, ChevronRight} from '@lucide/vue'

import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {useExpandedProjects} from '@/features/shell/useExpandedProjects'
import {cn} from '@/ui/cn'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiIcon from '@/ui/UiIcon.vue'

/** A project in the projects page, with its sub-projects folded under it (shared with the sidebar). */
const props = withDefaults(defineProps<{
	project: ProjectResponse
	depth?: number
	showArchived?: boolean
}>(), {
	depth: 0,
	showArchived: false,
})

const {t} = useI18n()
const projects = useProjects()
const {isExpanded, toggle} = useExpandedProjects()

const children = computed(() => projects.getChildProjects(props.project.id)
	.filter(child => props.showArchived || !child.is_archived))
const expanded = computed(() => isExpanded(props.project.id))
</script>

<template>
	<li>
		<div
			class="
				group/project relative flex min-h-11 items-center gap-1 pe-4
				hover:bg-canvas-subtle
				@xl:pe-6
				pointer-coarse:min-h-13
			"
			:style="{paddingInlineStart: `calc(${depth} * 1.25rem + 0.5rem)`}"
		>
			<button
				v-if="children.length"
				type="button"
				class="
					z-10 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-faint
					hover:text-ink
					pointer-coarse:size-10
				"
				:aria-expanded="expanded"
				:aria-label="t(expanded ? 'shell.collapseProject' : 'shell.expandProject', {project: project.title})"
				@click="toggle(project.id)"
			>
				<UiIcon
					:icon="ChevronRight"
					:class="cn('transition-transform duration-150', expanded && 'rotate-90')"
				/>
			</button>
			<span
				v-else
				class="w-8 shrink-0 pointer-coarse:w-10"
				aria-hidden="true"
			/>
			<UiColorDot
				:color="project.hex_color"
				class="me-2 size-2.5"
			/>
			<!-- The link covers the row; the chevron sits above it. -->
			<RouterLink
				:to="{name: 'project.index', params: {projectId: project.id}}"
				:class="cn(
					'min-w-0 flex-1 truncate text-base after:absolute after:inset-0 focus-visible:outline-none',
					'focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-inset pointer-coarse:text-md',
					project.is_archived && 'text-ink-faint',
				)"
			>
				{{ project.title }}
			</RouterLink>
			<UiIcon
				v-if="project.is_archived"
				:icon="Archive"
				:label="t('projects.archived')"
				size="sm"
				class="text-ink-faint"
			/>
			<span
				v-if="children.length"
				class="font-mono text-2xs text-ink-faint tabular-nums"
				:title="t('projects.subprojects', children.length)"
			>{{ children.length }}</span>
		</div>
		<ul
			v-if="expanded && children.length"
			role="list"
		>
			<ProjectTreeItem
				v-for="child in children"
				:key="child.id"
				:project="child"
				:depth="depth + 1"
				:show-archived="showArchived"
			/>
		</ul>
	</li>
</template>
