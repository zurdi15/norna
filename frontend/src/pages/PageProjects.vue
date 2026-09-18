<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {useRouteQuery} from '@vueuse/router'
import {Archive, FolderPlus} from '@lucide/vue'

import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import ProjectTreeItem from '@/features/projects/ProjectTreeItem.vue'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBackdropLink} from '@/features/shell/useRouteBackdrop'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

defineOptions({inheritAttrs: false})

/** Every project as a tree, with favorites and saved filters first; the phone's way into a project. */
const {t} = useI18n()
useTitle(() => t('projects.title'))

const projects = useProjects()
const backdropLink = useBackdropLink()
const {isMd} = useBreakpoints()

// Archived projects stay out of the way unless asked for, and the choice is kept in the url.
const archivedQuery = useRouteQuery('archived')
const showArchived = computed({
	get: () => archivedQuery.value === 'true',
	set: value => archivedQuery.value = value ? 'true' : undefined,
})

const roots = computed(() => projects.projectsArray
	.filter(project => project.id > 0
		&& (project.parent_project_id === 0 || !projects.projects[project.parent_project_id])
		&& (showArchived.value || !project.is_archived))
	.sort((a, b) => a.position - b.position))
const savedFilters = computed(() => projects.savedFilterProjects.filter(filter => showArchived.value || !filter.is_archived))
const favorites = computed(() => projects.favoriteProjects)
</script>

<template>
	<PageHeader
		:title="t('projects.title')"
		large
	>
		<template #actions>
			<UiButton
				v-if="isMd"
				variant="primary"
				size="sm"
				:icon="FolderPlus"
				:as="RouterLink"
				:to="backdropLink({name: 'project.create'})"
			>
				{{ t('projects.new') }}
			</UiButton>
			<MobileRootActions />
		</template>
		<template #below>
			<div class="flex items-center gap-2 px-4 pb-3 lg:px-6">
				<UiChip
					as="button"
					:pressed="showArchived"
					:icon="Archive"
					@click="showArchived = !showArchived"
				>
					{{ t('projects.showArchived') }}
				</UiChip>
				<span class="flex-1" />
				<UiButton
					v-if="!isMd"
					variant="secondary"
					size="sm"
					:icon="FolderPlus"
					:as="RouterLink"
					:to="backdropLink({name: 'project.create'})"
				>
					{{ t('projects.new') }}
				</UiButton>
			</div>
		</template>
	</PageHeader>

	<div class="@container pb-10">
		<div
			v-if="projects.isLoading"
			class="grid gap-3 p-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 6"
				:key="index"
				class="h-6 w-1/2"
			/>
		</div>
		<UiEmptyState
			v-else-if="!roots.length && !savedFilters.length"
			:title="t('projects.emptyTitle')"
			:description="t('projects.emptyDescription')"
			class="py-16"
		/>
		<template v-else>
			<section
				v-if="favorites.length"
				class="pb-2"
			>
				<UiSectionHeading
					:title="t('shell.nav.favorites')"
					:count="favorites.length"
					class="px-4 pt-4 pb-1.5 @xl:px-6"
				/>
				<ul role="list">
					<li
						v-for="project in favorites"
						:key="project.id"
					>
						<RouterLink
							:to="{name: 'project.index', params: {projectId: project.id}}"
							class="
								flex min-h-11 items-center gap-2.5 px-4 text-base
								hover:bg-canvas-subtle
								@xl:px-6
								pointer-coarse:min-h-13 pointer-coarse:text-md
							"
						>
							<UiColorDot
								:color="project.hex_color"
								class="size-2.5"
							/>
							<span class="truncate">{{ project.title }}</span>
						</RouterLink>
					</li>
				</ul>
			</section>
			<section class="pb-2">
				<UiSectionHeading
					:title="t('shell.nav.projects')"
					:count="roots.length"
					class="px-4 pt-4 pb-1.5 @xl:px-6"
				/>
				<ul role="list">
					<ProjectTreeItem
						v-for="project in roots"
						:key="project.id"
						:project="project"
						:show-archived="showArchived"
					/>
				</ul>
			</section>
			<section
				v-if="savedFilters.length"
				class="pb-2"
			>
				<UiSectionHeading
					:title="t('shell.nav.filters')"
					:count="savedFilters.length"
					class="px-4 pt-4 pb-1.5 @xl:px-6"
				/>
				<ul role="list">
					<li
						v-for="filter in savedFilters"
						:key="filter.id"
					>
						<RouterLink
							:to="{name: 'project.index', params: {projectId: filter.id}}"
							class="
								flex min-h-11 items-center gap-2.5 px-4 text-base
								hover:bg-canvas-subtle
								@xl:px-6
								pointer-coarse:min-h-13 pointer-coarse:text-md
							"
						>
							<UiColorDot
								:color="filter.hex_color"
								class="size-2.5"
							/>
							<span class="truncate">{{ filter.title }}</span>
						</RouterLink>
					</li>
				</ul>
			</section>
		</template>
	</div>
</template>
