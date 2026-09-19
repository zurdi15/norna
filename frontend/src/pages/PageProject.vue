<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {refDebounced} from '@vueuse/core'
import {Archive, Copy, Ellipsis, Image, Info, LayoutGrid, Pencil, Plus, Search, Share2, Star, Trash2, Webhook, X} from '@lucide/vue'

import {sortProjectViewsByPosition} from '@/client/queries/projectViews'
import {isSavedFilterProject, usePatchProjectFavoriteMutation} from '@/client/queries/projects'
import {useProject} from '@/composables/useProject'
import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import {PERMISSIONS} from '@/constants/permissions'
import {DEFAULT_PROJECT_VIEW_SETTINGS} from '@/constants/projectView'
import TaskFilterButton from '@/features/filters/TaskFilterButton.vue'
import ProjectGanttView from '@/features/project-views/gantt/ProjectGanttView.vue'
import ProjectKanbanView from '@/features/project-views/kanban/ProjectKanbanView.vue'
import ProjectListView from '@/features/project-views/list/ProjectListView.vue'
import ProjectViewSwitcher from '@/features/project-views/ProjectViewSwitcher.vue'
import ProjectTableView from '@/features/project-views/table/ProjectTableView.vue'
import {useViewFilters} from '@/features/project-views/useViewFilters'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBackdropLink} from '@/features/shell/useRouteBackdrop'
import {saveProjectView} from '@/helpers/projectView'
import {saveProjectToHistory} from '@/modules/projectHistory'
import {useAuthStore} from '@/stores/auth'
import {useBaseStore} from '@/stores/base'
import {useConfigStore} from '@/stores/config'
import {useShellStore} from '@/stores/shell'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import type {UiMenuEntry} from '@/ui/menu'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/**
 * A project (or saved filter) through one of its views. The page owns the header,
 * the view switcher, search and filter; each view kind renders the tasks its way.
 */
const props = defineProps<{
	projectId: number
	viewId?: number
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const configStore = useConfigStore()
const authStore = useAuthStore()
const baseStore = useBaseStore()
const shell = useShellStore()
const projects = useProjects()
const {isMd} = useBreakpoints()
const favorite = usePatchProjectFavoriteMutation()
const backdropLink = useBackdropLink()

const {project, isLoaded, error} = useProject(() => props.projectId)
const views = computed(() => sortProjectViewsByPosition([...(project.value.views ?? [])]))
const view = computed(() => views.value.find(candidate => candidate.id === props.viewId))

useTitle(() => project.value.title || t('projectView.title'))

// A missing or unknown view (a sidebar link, a stale bookmark) goes to the preferred one.
watch([isLoaded, views, () => props.viewId], ([loaded]) => {
	if (!loaded || views.value.length === 0 || view.value) {
		return
	}
	const preferred = authStore.settings.frontend_settings.default_view
	const fallback = (preferred !== DEFAULT_PROJECT_VIEW_SETTINGS.FIRST
		&& views.value.find(candidate => candidate.view_kind === preferred)) || views.value[0]!
	void router.replace({name: 'project.view', params: {projectId: props.projectId, viewId: fallback.id}})
}, {immediate: true})

watch(() => [props.projectId, view.value?.id] as const, ([projectId, viewId]) => {
	if (viewId !== undefined) {
		saveProjectView(projectId, viewId)
	}
	// Recent projects (home, palette) only list real ones.
	if (projectId > 0) {
		saveProjectToHistory({id: projectId})
	}
	baseStore.setCurrentProject({id: projectId}, viewId)
}, {immediate: true})

const ancestors = computed(() => projects.getAncestors(project.value).slice(0, -1).map(ancestor => ancestor.title).join(' / '))
const canWrite = computed(() => (project.value.max_permission ?? PERMISSIONS.READ) >= PERMISSIONS.READ_WRITE
	&& !isSavedFilterProject(project.value))

const {filters, update} = useViewFilters()

// Typing searches after a pause; the url (and so the query) follows the debounced text.
const searchText = ref(filters.value.q)
const debouncedSearch = refDebounced(searchText, 300)
watch(debouncedSearch, q => update({q}))
watch(() => filters.value.q, q => {
	if (q !== debouncedSearch.value) {
		searchText.value = q
	}
})

const filterValue = computed({
	get: () => ({filter: filters.value.filter, filter_include_nulls: filters.value.filter_include_nulls}),
	set: value => update(value),
})

// Settings open as their own pages; a saved filter only has edit and delete.
const menuItems = computed<UiMenuEntry[]>(() => {
	const params = {projectId: project.value.id}
	const go = (name: string) => () => void router.push(backdropLink({name, params}))
	if (isSavedFilterProject(project.value)) {
		return [
			{label: t('projectView.menu.editFilter'), icon: Pencil, onSelect: go('filter.settings.edit')},
			{type: 'separator'},
			{label: t('projectView.menu.deleteFilter'), icon: Trash2, tone: 'danger', onSelect: go('filter.settings.delete')},
		]
	}
	// What the api allows: editing, the background and webhooks take write access;
	// views, archiving and deleting take admin. Anyone can see who it's shared with.
	const permission = project.value.max_permission ?? PERMISSIONS.READ
	const write = permission >= PERMISSIONS.READ_WRITE
	const admin = permission >= PERMISSIONS.ADMIN
	const entries: (UiMenuEntry | false)[] = [
		project.value.description !== '' && {label: t('projectView.menu.info'), icon: Info, onSelect: go('project.info')},
		write && {label: t('projectView.menu.edit'), icon: Pencil, onSelect: go('project.settings.edit')},
		admin && {label: t('projectView.menu.views'), icon: LayoutGrid, onSelect: go('project.settings.views')},
		write && configStore.enabled_background_providers.length > 0
			&& {label: t('projectView.menu.background'), icon: Image, onSelect: go('project.settings.background')},
		{label: t('projectView.menu.share'), icon: Share2, onSelect: go('project.settings.share')},
		write && configStore.webhooks_enabled
			&& {label: t('projectView.menu.webhooks'), icon: Webhook, onSelect: go('project.settings.webhooks')},
		{label: t('projectView.menu.duplicate'), icon: Copy, onSelect: go('project.settings.duplicate')},
	]
	return [
		...entries.filter(entry => entry !== false),
		...(admin ? [
			{type: 'separator' as const},
			{label: t('projectView.menu.archive'), icon: Archive, onSelect: go('project.settings.archive')},
			{label: t('projectView.menu.delete'), icon: Trash2, tone: 'danger' as const, onSelect: go('project.settings.delete')},
		] : []),
	]
})

const VIEW_COMPONENTS = {
	list: ProjectListView,
	table: ProjectTableView,
	kanban: ProjectKanbanView,
	gantt: ProjectGanttView,
} as const
</script>

<template>
	<PageHeader
		:title="project.title"
		:caption="ancestors || undefined"
		:back="isMd ? false : {name: 'projects.index'}"
	>
		<template #title>
			<span class="flex min-w-0 items-center gap-2">
				<UiColorDot
					:color="project.hex_color"
					class="size-2.5"
				/>
				<span class="truncate">{{ project.title }}</span>
			</span>
		</template>
		<template #actions>
			<UiIconButton
				v-if="project.id > 0"
				:icon="Star"
				:label="project.is_favorite ? t('projectView.unfavorite') : t('projectView.favorite')"
				:aria-pressed="project.is_favorite"
				:class="project.is_favorite && '[&_svg]:fill-warning [&_svg]:text-warning'"
				@click="favorite.mutate({id: project.id, isFavorite: !project.is_favorite})"
			/>
			<UiMenu
				v-if="project.id !== -1"
				:items="menuItems"
				:title="project.title"
			>
				<template #trigger>
					<UiIconButton
						:icon="Ellipsis"
						:label="t('projectView.menu.title')"
					/>
				</template>
			</UiMenu>
			<UiButton
				v-if="canWrite && isMd"
				variant="primary"
				size="sm"
				:icon="Plus"
				shortcut="KeyN"
				@click="shell.quickAddOpen = true"
			>
				{{ t('agenda.newTask') }}
			</UiButton>
		</template>
		<template #below>
			<div class="flex items-end gap-3 px-2 md:px-4 lg:px-6">
				<ProjectViewSwitcher
					v-if="views.length > 1"
					:project-id="project.id"
					:views="views"
					:current-view-id="view?.id ?? 0"
					class="min-w-0 flex-1 pb-2 md:pb-0"
				/>
				<span
					v-else
					class="flex-1"
				/>
				<div class="flex shrink-0 items-center gap-1 pb-2">
					<label class="relative hidden items-center md:flex">
						<UiIcon
							:icon="Search"
							size="sm"
							class="pointer-events-none absolute inset-s-2 text-ink-faint"
						/>
						<input
							v-model="searchText"
							type="search"
							:aria-label="t('projectView.search')"
							:placeholder="t('projectView.search')"
							class="
								h-7 w-40 rounded-md border border-line bg-surface ps-7 pe-2 text-sm transition-[width]
								placeholder:text-ink-faint
								focus:w-56 focus:border-accent focus:outline-none
							"
						>
					</label>
					<TaskFilterButton
						v-model="filterValue"
						:project-id="project.id"
					/>
				</div>
			</div>
			<!-- Phones search in their own row under the views. -->
			<div
				v-if="!isMd"
				class="px-4 pb-3"
			>
				<label class="relative flex items-center">
					<UiIcon
						:icon="Search"
						size="sm"
						class="pointer-events-none absolute inset-s-3 text-ink-faint"
					/>
					<input
						v-model="searchText"
						type="search"
						enterkeyhint="search"
						:aria-label="t('projectView.search')"
						:placeholder="t('projectView.search')"
						class="
							h-10 w-full rounded-md border border-line bg-surface ps-9 pe-9 text-lg
							placeholder:text-ink-faint
							focus:border-accent focus:outline-none
						"
					>
					<button
						v-if="searchText"
						type="button"
						class="absolute inset-e-1 grid size-8 place-items-center text-ink-faint"
						:aria-label="t('projectView.clearSearch')"
						@click="searchText = ''"
					>
						<UiIcon :icon="X" />
					</button>
				</label>
			</div>
		</template>
	</PageHeader>

	<UiEmptyState
		v-if="error && !isLoaded"
		:title="t('projectView.notFound')"
		:description="t('projectView.notFoundDescription')"
		class="py-20"
	/>
	<div
		v-else-if="!isLoaded || !view"
		class="grid gap-3 p-6"
		aria-hidden="true"
	>
		<UiSkeleton
			v-for="index in 5"
			:key="index"
			class="h-5 w-3/4"
		/>
	</div>
	<component
		:is="VIEW_COMPONENTS[view.view_kind ?? 'list']"
		v-else
		:key="view.id"
		:project="project"
		:view="view"
		:filters="filters"
		:can-write="canWrite"
	/>
</template>
