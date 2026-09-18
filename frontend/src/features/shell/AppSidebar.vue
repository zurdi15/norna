<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Bell, CalendarDays, FolderKanban, House, ListFilter, PanelLeft, Plus, Search, Star, Tag, Timer, Users} from '@lucide/vue'

import {SHORTCUTS} from '@/constants/shortcuts'
import {PRO_FEATURE} from '@/constants/proFeatures'
import {useNotifications} from '@/composables/useNotifications'
import {useProjects} from '@/composables/useProjects'
import {useBaseStore} from '@/stores/base'
import {useConfigStore} from '@/stores/config'
import {useShellStore} from '@/stores/shell'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiKbd from '@/ui/UiKbd.vue'
import UiTooltip from '@/ui/UiTooltip.vue'

import NornaMark from './NornaMark.vue'
import NotificationsPopover from './NotificationsPopover.vue'
import SidebarLink from './SidebarLink.vue'
import SidebarProjectItem from './SidebarProjectItem.vue'
import UserMenu from './UserMenu.vue'

// In the drawer (below lg) the sidebar is never collapsed and hides the collapse button.
const props = withDefaults(defineProps<{
	inDrawer?: boolean
}>(), {
	inDrawer: false,
})

const {t} = useI18n()
const shell = useShellStore()
const baseStore = useBaseStore()
const configStore = useConfigStore()
const projects = useProjects()
const {unreadCount} = useNotifications()

const collapsed = computed(() => !props.inDrawer && shell.sidebarCollapsed)
const timeTrackingEnabled = computed(() => configStore.isProFeatureEnabled(PRO_FEATURE.TIME_TRACKING))

const favorites = computed(() => projects.favoriteProjects)
const savedFilters = computed(() => projects.savedFilterProjects.filter(filter => !filter.is_archived))

const sectionTitle = 'flex items-center gap-2 px-2 pt-4 pb-1.5 caption'
</script>

<template>
	<nav
		:aria-label="t('shell.navigation')"
		:class="cn(
			'flex h-full flex-col bg-canvas-subtle',
			!inDrawer && 'border-e border-line',
			inDrawer ? 'w-full' : collapsed ? 'w-14' : 'w-64',
		)"
	>
		<div :class="cn('flex h-14 shrink-0 items-center gap-2 px-3', collapsed && 'justify-center px-0')">
			<UiIconButton
				v-if="collapsed"
				:icon="PanelLeft"
				:label="t('shell.expandSidebar')"
				bind-shortcut
				:shortcut="SHORTCUTS.toggleMenu"
				tooltip-side="right"
				@click="shell.toggleSidebar()"
			/>
			<template v-else>
				<RouterLink
					:to="{name: 'home'}"
					class="flex min-w-0 items-center gap-2.5 rounded-md"
				>
					<NornaMark class="size-6" />
					<span class="text-md font-semibold tracking-tight">Norna</span>
				</RouterLink>
				<span class="flex-1" />
				<UiIconButton
					v-if="!inDrawer"
					:icon="PanelLeft"
					:label="t('shell.collapseSidebar')"
					bind-shortcut
					:shortcut="SHORTCUTS.toggleMenu"
					size="sm"
					tooltip-side="right"
					@click="shell.toggleSidebar()"
				/>
			</template>
		</div>

		<div :class="cn('grid shrink-0 gap-px px-2', collapsed && 'justify-items-center')">
			<UiTooltip
				:content="t('shell.search')"
				:shortcut="SHORTCUTS.quickSearch"
				side="right"
				:disabled="!collapsed"
			>
				<button
					v-shortcut="SHORTCUTS.quickSearch"
					type="button"
					:aria-label="collapsed ? t('shell.search') : undefined"
					:class="cn(
						'mb-2 flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2 text-base',
						'text-ink-faint transition-colors duration-150 hover:border-line-strong hover:text-ink-muted',
						collapsed ? 'w-9 justify-center px-0' : 'w-full',
					)"
					@click="shell.commandPaletteOpen = true"
				>
					<UiIcon :icon="Search" />
					<template v-if="!collapsed">
						<span class="flex-1 text-start">{{ t('shell.searchPlaceholder') }}</span>
						<UiKbd :shortcut="SHORTCUTS.quickSearch" />
					</template>
				</button>
			</UiTooltip>

			<SidebarLink
				:to="{name: 'home'}"
				:icon="House"
				:label="t('shell.nav.home')"
				:collapsed="collapsed"
				:shortcut="SHORTCUTS.navigation.overview"
				exact
			/>
			<SidebarLink
				:to="{name: 'tasks.range'}"
				:icon="CalendarDays"
				:label="t('shell.nav.upcoming')"
				:collapsed="collapsed"
				:shortcut="SHORTCUTS.navigation.upcoming"
			/>
			<NotificationsPopover>
				<button
					type="button"
					:aria-label="collapsed ? t('notifications.title') : undefined"
					:class="cn(
						'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-base text-ink-muted',
						'transition-colors duration-150 hover:bg-surface hover:text-ink pointer-coarse:h-10',
						collapsed && 'relative justify-center px-0',
					)"
				>
					<UiIcon :icon="Bell" />
					<span
						v-if="!collapsed"
						class="flex-1 text-start"
					>{{ t('notifications.title') }}</span>
					<span
						v-if="unreadCount > 0"
						:class="cn(
							'rounded-full bg-accent font-mono text-3xs/4 text-on-accent tabular-nums',
							collapsed ? 'absolute inset-e-1.5 top-1 size-2 text-transparent' : 'min-w-4.5 px-1 text-center',
						)"
					>{{ unreadCount }}</span>
				</button>
			</NotificationsPopover>
			<SidebarLink
				v-if="timeTrackingEnabled"
				:to="{name: 'time-tracking'}"
				:icon="Timer"
				:label="t('shell.nav.timeTracking')"
				:collapsed="collapsed"
			/>
			<SidebarLink
				v-if="collapsed"
				:to="{name: 'projects.index'}"
				:icon="FolderKanban"
				:label="t('shell.nav.projects')"
				:collapsed="collapsed"
				:shortcut="SHORTCUTS.navigation.projects"
			/>
		</div>

		<div
			v-if="!collapsed"
			class="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
		>
			<template v-if="favorites.length">
				<p :class="sectionTitle">
					{{ t('shell.nav.favorites') }}<span class="thread" />
				</p>
				<ul class="grid gap-px">
					<li
						v-for="project in favorites"
						:key="project.id"
					>
						<SidebarLink
							:to="{name: 'project.index', params: {projectId: project.id}}"
							:label="project.title"
							:color="project.id > 0 ? project.hex_color : undefined"
							:icon="project.id < 0 ? Star : undefined"
							:active="baseStore.currentProjectId === project.id"
						/>
					</li>
				</ul>
			</template>

			<p :class="sectionTitle">
				<RouterLink
					v-shortcut="SHORTCUTS.navigation.projects"
					:to="{name: 'projects.index'}"
					class="hover:text-ink"
				>
					{{ t('shell.nav.projects') }}
				</RouterLink>
				<span class="thread" />
				<RouterLink
					:to="{name: 'project.create'}"
					class="grid size-5 place-items-center rounded-sm text-ink-faint hover:bg-surface hover:text-ink"
					:aria-label="t('shell.nav.newProject')"
				>
					<UiIcon
						:icon="Plus"
						size="sm"
					/>
				</RouterLink>
			</p>
			<ul class="grid gap-px">
				<SidebarProjectItem
					v-for="project in projects.notArchivedRootProjects"
					:key="project.id"
					:project="project"
				/>
			</ul>

			<template v-if="savedFilters.length">
				<p :class="sectionTitle">
					{{ t('shell.nav.filters') }}<span class="thread" />
				</p>
				<ul class="grid gap-px">
					<li
						v-for="filter in savedFilters"
						:key="filter.id"
					>
						<SidebarLink
							:to="{name: 'project.index', params: {projectId: filter.id}}"
							:label="filter.title"
							:icon="ListFilter"
							:active="baseStore.currentProjectId === filter.id"
						/>
					</li>
				</ul>
			</template>
		</div>
		<div
			v-else
			class="flex-1"
		/>

		<div :class="cn('grid shrink-0 gap-px border-t border-line p-2 pb-safe', collapsed && 'justify-items-center')">
			<SidebarLink
				:to="{name: 'labels.index'}"
				:icon="Tag"
				:label="t('shell.nav.labels')"
				:collapsed="collapsed"
				:shortcut="SHORTCUTS.navigation.labels"
			/>
			<SidebarLink
				:to="{name: 'teams.index'}"
				:icon="Users"
				:label="t('shell.nav.teams')"
				:collapsed="collapsed"
				:shortcut="SHORTCUTS.navigation.teams"
			/>
			<UserMenu :collapsed="collapsed" />
		</div>
	</nav>
</template>
