<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {Bell, BellOff, ChevronLeft, ChevronRight, Ellipsis, Star, X} from '@lucide/vue'

import type {TaskDetail} from '@/client/queries/tasks'
import {useSetTaskSubscriptionMutation} from '@/client/queries/subscriptions'
import {useProjects} from '@/composables/useProjects'
import {getTaskIdentifier} from '@/modules/task/task'
import {useTaskActionsStore} from '@/stores/taskActions'
import {cn} from '@/ui/cn'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {useTaskMenu} from '../useTaskMenu'

/** The bar above a task: where it lives (project › identifier) and what can be done with it. */
const props = defineProps<{
	task: TaskDetail
	inPanel: boolean
}>()

const emit = defineEmits<{
	close: []
	deleted: []
}>()

const {t} = useI18n()
const router = useRouter()
const projects = useProjects()
const actions = useTaskActionsStore()
const taskMenu = useTaskMenu()
const subscription = useSetTaskSubscriptionMutation()

const project = computed(() => projects.projects[props.task.project_id ?? 0])
const identifier = computed(() => getTaskIdentifier(props.task))
const subscribed = computed(() => props.task.subscription != null)

// "Open" makes no sense for the task on screen; everything else is shared with the rows.
const menuItems = computed(() => taskMenu(props.task, {onDeleted: () => emit('deleted')}).slice(1))

function back() {
	if (window.history.state?.back) {
		router.back()
	} else if (project.value) {
		void router.push({name: 'project.index', params: {projectId: project.value.id}})
	} else {
		void router.push({name: 'home'})
	}
}

function toggleSubscription() {
	if (props.task.id !== undefined) {
		subscription.mutate({taskId: props.task.id, subscribed: !subscribed.value})
	}
}
</script>

<template>
	<header
		:class="cn(
			'sticky top-0 z-(--z-sticky) flex h-12 shrink-0 items-center gap-0.5 border-b border-line pe-2',
			inPanel ? 'bg-surface/90 ps-5 backdrop-blur-md' : 'bg-canvas/90 ps-2 pt-safe backdrop-blur-md md:h-14 md:ps-4',
		)"
	>
		<UiIconButton
			v-if="!inPanel"
			:icon="ChevronLeft"
			:label="t('shell.back')"
			@click="back"
		/>
		<nav
			:aria-label="t('taskDetail.breadcrumb')"
			class="flex min-w-0 flex-1 items-center gap-1.5 px-1 font-mono text-xs text-ink-faint"
		>
			<RouterLink
				v-if="project"
				:to="{name: 'project.index', params: {projectId: project.id}}"
				class="flex min-w-0 items-center gap-1.5 rounded-sm hover:text-ink"
			>
				<UiColorDot :color="project.hex_color" />
				<span class="truncate">{{ project.title }}</span>
			</RouterLink>
			<ChevronRight
				v-if="project"
				class="size-3 shrink-0"
				aria-hidden="true"
			/>
			<span class="shrink-0 text-ink-muted">{{ identifier }}</span>
		</nav>
		<UiIconButton
			:icon="Star"
			:label="task.is_favorite ? t('tasks.actions.unfavorite') : t('tasks.actions.favorite')"
			:aria-pressed="task.is_favorite"
			:class="task.is_favorite && '[&_svg]:fill-warning [&_svg]:text-warning'"
			@click="actions.toggleFavorite(task)"
		/>
		<UiIconButton
			:icon="subscribed ? Bell : BellOff"
			:label="subscribed ? t('taskDetail.unsubscribe') : t('taskDetail.subscribe')"
			:aria-pressed="subscribed"
			:loading="subscription.isPending.value"
			@click="toggleSubscription"
		/>
		<UiMenu
			:items="menuItems"
			:title="task.title ?? ''"
		>
			<template #trigger>
				<UiIconButton
					:icon="Ellipsis"
					:label="t('tasks.row.actions')"
				/>
			</template>
		</UiMenu>
		<UiIconButton
			v-if="inPanel"
			:icon="X"
			:label="t('taskDetail.close')"
			shortcut="Escape"
			@click="emit('close')"
		/>
	</header>
</template>
