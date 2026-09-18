<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {useTitle} from '@/composables/useTitle'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import TaskList, {type TaskListGroup} from '@/features/tasks/TaskList.vue'
import TaskListSkeleton from '@/features/tasks/TaskListSkeleton.vue'
import {provideTaskSelection} from '@/features/tasks/selection'
import TaskSelectionBar from '@/features/tasks/TaskSelectionBar.vue'
import {useAgenda} from '@/features/tasks/useAgenda'
import type {ProjectResponse} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import {getHistory} from '@/modules/projectHistory'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import {isoWeek} from '@/modules/task/dueDate'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useShellStore} from '@/stores/shell'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'

// Receives no route props, but a fragment root must not inherit stray attributes.
defineOptions({inheritAttrs: false})

const selection = provideTaskSelection()
const {t, locale} = useI18n()
useTitle(() => t('agenda.title'))

const shell = useShellStore()
const {isMd} = useBreakpoints()
const {now} = useGlobalNow()
const agenda = useAgenda()

// "jue 18 sept · semana 38": the day at a glance, in the mono of the metadata.
const caption = computed(() => {
	const parts = new Intl.DateTimeFormat(locale.value, {weekday: 'short', day: 'numeric', month: 'short'}).formatToParts(now.value)
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(candidate => candidate.type === type)?.value ?? ''
	return `${part('weekday')} ${part('day')} ${part('month')} · ${t('agenda.week', {week: isoWeek(now.value)})}`
})

const groups = computed<TaskListGroup[]>(() => [
	{
		key: 'overdue',
		caption: t('agenda.norns.past'),
		title: t('agenda.overdue'),
		tone: 'danger',
		tasks: agenda.overdue.value,
	},
	{
		key: 'today',
		caption: t('agenda.norns.present'),
		title: t('agenda.today'),
		tasks: agenda.dueToday.value,
		keepWhenEmpty: true,
	},
	{
		key: 'upcoming',
		caption: t('agenda.norns.future'),
		title: t('agenda.upcoming'),
		tasks: agenda.upcoming.value,
		keepWhenEmpty: true,
	},
])

// Read once per visit: the list only changes while browsing projects, away from here.
const projects = useProjects()
const history = getHistory()
const recentProjects = computed(() => history
	.map(entry => projects.projects[entry.id])
	.filter((project): project is ProjectResponse => project !== undefined && !project.is_archived))

const nothingAtAll = computed(() => groups.value.every(group => group.tasks.length === 0))
</script>

<template>
	<PageHeader
		:title="t('agenda.title')"
		:caption="isMd ? caption : undefined"
		large
	>
		<template #subtitle>
			<p class="mt-1 caption">
				{{ caption }}
			</p>
		</template>
		<template #actions>
			<UiButton
				v-if="isMd"
				variant="primary"
				size="sm"
				:icon="Plus"
				shortcut="KeyN"
				@click="shell.quickAddOpen = true"
			>
				{{ t('agenda.newTask') }}
			</UiButton>
			<MobileRootActions />
		</template>
	</PageHeader>

	<div class="pb-10">
		<TaskListSkeleton v-if="agenda.isPending.value" />
		<UiEmptyState
			v-else-if="agenda.isError.value"
			:title="t('agenda.loadFailed')"
		>
			<template #actions>
				<UiButton @click="agenda.refetch()">
					{{ t('agenda.retry') }}
				</UiButton>
			</template>
		</UiEmptyState>
		<template v-else>
			<TaskList :groups="groups">
				<template #group-empty="{group}">
					<p class="px-4 py-2 text-sm text-ink-faint @xl:px-6">
						{{ group.key === 'today' ? t('agenda.todayEmpty') : t('agenda.upcomingEmpty') }}
					</p>
				</template>
			</TaskList>
			<p
				v-if="nothingAtAll"
				class="px-4 pt-6 text-center text-sm text-ink-muted"
			>
				{{ t('agenda.allClear') }}
			</p>
			<section
				v-if="recentProjects.length"
				class="@container pt-6"
			>
				<UiSectionHeading
					:title="t('agenda.recentProjects')"
					class="px-4 pb-2 @xl:px-6"
				/>
				<ul
					role="list"
					class="flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1 @xl:flex-wrap @xl:px-6"
				>
					<li
						v-for="project in recentProjects"
						:key="project.id"
						class="shrink-0"
					>
						<RouterLink
							:to="{name: 'project.index', params: {projectId: project.id}}"
							class="
								flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm
								transition-colors
								hover:bg-canvas-subtle
								focus-visible:outline-2 focus-visible:outline-accent
								pointer-coarse:h-11 pointer-coarse:text-md
							"
						>
							<UiColorDot :color="project.hex_color" />
							{{ project.title }}
						</RouterLink>
					</li>
				</ul>
			</section>
		</template>
	</div>
	<TaskSelectionBar :selection="selection" />
</template>
