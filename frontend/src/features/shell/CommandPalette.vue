<script setup lang="ts">
import {computed, ref, watch, type Component} from 'vue'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {
	CalendarDays,
	FilePlus2,
	FolderKanban,
	FolderPlus,
	House,
	Keyboard,
	ListFilter,
	Moon,
	Search,
	Settings,
	Sun,
	Tag,
	Users,
} from '@lucide/vue'

import {SHORTCUTS} from '@/constants/shortcuts'
import {useProjects} from '@/composables/useProjects'
import {getHistory} from '@/modules/projectHistory'
import {useAuthStore} from '@/stores/auth'
import {useShellStore} from '@/stores/shell'
import {useColorScheme} from '@/composables/useColorScheme'
import {cn} from '@/ui/cn'
import {useListNavigation} from '@/ui/composables/useListNavigation'
import {matchesSearch} from '@/ui/search'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiKbd from '@/ui/UiKbd.vue'

interface Command {
	key: string
	label: string
	icon?: Component
	// Project color: a dot instead of an icon.
	color?: string | null
	shortcut?: string
	// Extra words that should find the command, e.g. "tema" for the theme switch.
	keywords?: string
	run: () => void
}

interface CommandGroup {
	key: string
	label: string
	commands: Command[]
}

const RESULTS_PER_GROUP = 8
const RECENT_PROJECTS = 5

const {t} = useI18n()
const router = useRouter()
const shell = useShellStore()
const authStore = useAuthStore()
const projects = useProjects()
const {isDark} = useColorScheme()

const query = ref('')
watch(() => shell.commandPaletteOpen, open => {
	if (open) {
		query.value = ''
	}
})

function go(name: string, params?: Record<string, number>) {
	return () => router.push({name, params})
}

const actions = computed<Command[]>(() => [
	{key: 'new-task', label: t('shell.palette.newTask'), icon: FilePlus2, keywords: 'create add', run: () => shell.quickAddOpen = true},
	{key: 'new-project', label: t('shell.palette.newProject'), icon: FolderPlus, keywords: 'create add', run: go('project.create')},
	{key: 'new-filter', label: t('shell.palette.newFilter'), icon: ListFilter, keywords: 'create add', run: go('filters.create')},
	{
		key: 'theme',
		label: t(isDark.value ? 'shell.palette.lightTheme' : 'shell.palette.darkTheme'),
		icon: isDark.value ? Sun : Moon,
		keywords: t('shell.user.theme'),
		run: () => authStore.saveFrontendSettings({color_schema: isDark.value ? 'light' : 'dark'}),
	},
	{key: 'shortcuts', label: t('shell.shortcuts.title'), icon: Keyboard, shortcut: SHORTCUTS.showKeyboardShortcuts, run: () => shell.shortcutsOpen = true},
])

const navigation = computed<Command[]>(() => [
	{key: 'home', label: t('shell.nav.home'), icon: House, shortcut: SHORTCUTS.navigation.overview, run: go('home')},
	{key: 'upcoming', label: t('shell.nav.upcoming'), icon: CalendarDays, shortcut: SHORTCUTS.navigation.upcoming, run: go('tasks.range')},
	{key: 'projects', label: t('shell.nav.projects'), icon: FolderKanban, shortcut: SHORTCUTS.navigation.projects, run: go('projects.index')},
	{key: 'labels', label: t('shell.nav.labels'), icon: Tag, shortcut: SHORTCUTS.navigation.labels, run: go('labels.index')},
	{key: 'teams', label: t('shell.nav.teams'), icon: Users, shortcut: SHORTCUTS.navigation.teams, run: go('teams.index')},
	{key: 'settings', label: t('shell.user.settings'), icon: Settings, run: go('user.settings')},
])

const projectCommands = computed<Command[]>(() => {
	const open = projects.projectsArray.filter(project => !project.is_archived)
	const candidates = query.value === ''
		? getHistory()
			.map(entry => open.find(project => project.id === entry.id))
			.filter(project => project !== undefined)
			.slice(0, RECENT_PROJECTS)
		: open
	return candidates.map(project => ({
		key: `project-${project.id}`,
		label: project.title,
		color: project.id > 0 ? project.hex_color : undefined,
		icon: project.id < 0 ? ListFilter : undefined,
		run: go('project.index', {projectId: project.id}),
	}))
})

function matching(commands: Command[]): Command[] {
	return commands
		.filter(command => matchesSearch(`${command.label} ${command.keywords ?? ''}`, query.value))
		.slice(0, RESULTS_PER_GROUP)
}

const groups = computed<CommandGroup[]>(() => [
	{key: 'projects', label: t(query.value ? 'shell.nav.projects' : 'shell.palette.recent'), commands: matching(projectCommands.value)},
	{key: 'actions', label: t('shell.palette.actions'), commands: matching(actions.value)},
	{key: 'navigation', label: t('shell.palette.goTo'), commands: matching(navigation.value)},
].filter(group => group.commands.length > 0))

const commands = computed(() => groups.value.flatMap(group => group.commands))

function run(command: Command) {
	shell.commandPaletteOpen = false
	command.run()
}

const listNav = useListNavigation({
	items: commands,
	getKey: command => command.key,
	onSelect: run,
	idPrefix: 'palette',
})
</script>

<template>
	<UiDialog
		v-model:open="shell.commandPaletteOpen"
		:title="t('shell.palette.title')"
		hide-title
		position="top"
		body-class="p-0"
	>
		<div class="flex items-center gap-2.5 border-b border-line px-4">
			<UiIcon
				:icon="Search"
				class="text-ink-faint"
			/>
			<input
				v-model="query"
				data-autofocus
				type="text"
				role="combobox"
				aria-expanded="true"
				aria-controls="palette-list"
				aria-autocomplete="list"
				:aria-activedescendant="listNav.activeDescendant.value"
				:aria-label="t('shell.palette.title')"
				:placeholder="t('shell.palette.placeholder')"
				autocomplete="off"
				spellcheck="false"
				class="
					h-12 min-w-0 flex-1 bg-transparent text-md
					placeholder:text-ink-faint
					focus:outline-none
					pointer-coarse:h-14 pointer-coarse:text-lg
				"
				@keydown="listNav.onKeydown"
			>
			<UiKbd
				shortcut="Escape"
				class="hidden pointer-fine:inline-flex"
			/>
		</div>
		<div
			id="palette-list"
			role="listbox"
			:aria-label="t('shell.palette.title')"
			class="max-h-[min(26rem,60dvh)] overflow-y-auto p-1.5"
		>
			<div
				v-for="group in groups"
				:key="group.key"
				role="group"
				:aria-labelledby="`palette-group-${group.key}`"
				class="pb-1"
			>
				<p
					:id="`palette-group-${group.key}`"
					class="px-2.5 pt-2 pb-1 caption"
				>
					{{ group.label }}
				</p>
				<div
					v-for="command in group.commands"
					:id="listNav.optionId(command)"
					:key="command.key"
					role="option"
					:aria-selected="listNav.activeItem.value?.key === command.key"
					:class="cn(
						'flex h-9 cursor-pointer items-center gap-3 rounded-md px-2.5 text-base select-none',
						'aria-selected:bg-canvas-subtle pointer-coarse:h-12 pointer-coarse:text-md',
					)"
					@click="run(command)"
					@mousemove="listNav.setActive(commands.indexOf(command))"
				>
					<UiColorDot
						v-if="command.color !== undefined"
						:color="command.color"
						class="mx-1"
					/>
					<UiIcon
						v-else-if="command.icon"
						:icon="command.icon"
						class="text-ink-muted"
					/>
					<span class="min-w-0 flex-1 truncate">{{ command.label }}</span>
					<UiKbd
						v-if="command.shortcut"
						:shortcut="command.shortcut"
						class="hidden pointer-fine:inline-flex"
					/>
				</div>
			</div>
			<p
				v-if="groups.length === 0"
				class="px-3 py-10 text-center text-sm text-ink-faint"
			>
				{{ t('shell.palette.empty', {query}) }}
			</p>
		</div>
	</UiDialog>
</template>
