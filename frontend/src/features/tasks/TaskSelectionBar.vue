<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {onKeyStroke} from '@vueuse/core'
import {CalendarDays, CircleCheck, Flag, FolderInput, Trash2, X} from '@lucide/vue'

import {getDateWithTime} from '@/helpers/time/getDateWithTime'
import {addDays, startOfDay} from '@/helpers/time/dateMath'
import {useTaskActionsStore} from '@/stores/taskActions'
import type {UiMenuEntry} from '@/ui/menu'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

import {PRIORITY_LEVELS, priorityLabelKey} from './priority'
import ProjectPicker from './properties/ProjectPicker.vue'
import type {TaskSelection} from './selection'

/** Floats over the list while tasks are selected and acts on all of them at once. */
const props = defineProps<{
	selection: TaskSelection
}>()

const {t} = useI18n()
const actions = useTaskActionsStore()
const moveOpen = ref(false)

const tasks = computed(() => props.selection.tasks)

async function run(action: () => Promise<unknown>) {
	await action()
	props.selection.clear()
}

function dueIn(days: number | null) {
	void run(() => actions.bulkUpdate(tasks.value, {
		due_date: days === null ? null : getDateWithTime(addDays(startOfDay(new Date()), days)),
	}))
}

const dueItems = computed<UiMenuEntry[]>(() => [
	{label: t('tasks.actions.dueToday'), onSelect: () => dueIn(0)},
	{label: t('tasks.actions.dueTomorrow'), onSelect: () => dueIn(1)},
	{label: t('tasks.actions.dueNextWeek'), onSelect: () => dueIn(7)},
	{type: 'separator'},
	{label: t('tasks.actions.dueRemove'), onSelect: () => dueIn(null)},
])

const priorityItems = computed<UiMenuEntry[]>(() => PRIORITY_LEVELS.map(level => ({
	label: t(priorityLabelKey(level)),
	onSelect: () => void run(() => actions.bulkUpdate(tasks.value, {priority: level})),
})))

function moveTo(projectId: number) {
	moveOpen.value = false
	void run(() => actions.bulkUpdate(tasks.value, {project_id: projectId}))
}

async function remove() {
	if (await actions.bulkDelete(tasks.value)) {
		props.selection.clear()
	}
}

// Escape leaves selection mode unless something on top (a menu, a picker) takes it first.
onKeyStroke('Escape', event => {
	if (props.selection.active && !event.defaultPrevented
		&& !document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]')) {
		props.selection.clear()
	}
})
</script>

<template>
	<Transition
		enter-from-class="translate-y-4 opacity-0"
		leave-to-class="translate-y-4 opacity-0"
		enter-active-class="transition duration-200 ease-out"
		leave-active-class="transition duration-150 ease-in"
	>
		<div
			v-if="selection.active"
			role="toolbar"
			:aria-label="t('tasks.bulk.toolbar')"
			class="
				fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-(--z-overlay) mx-auto flex max-w-lg
				items-center gap-0.5 rounded-lg border border-line bg-surface-raised p-1.5 shadow-overlay
				md:bottom-6
			"
		>
			<UiIconButton
				:icon="X"
				:label="t('tasks.bulk.clear')"
				shortcut="Escape"
				@click="selection.clear()"
			/>
			<span
				class="me-auto ps-1 font-mono text-sm whitespace-nowrap text-ink tabular-nums"
				aria-live="polite"
			>
				<span aria-hidden="true">{{ tasks.length }}</span>
				<span class="sr-only">{{ t('tasks.bulk.selected', tasks.length) }}</span>
			</span>
			<UiIconButton
				:icon="CircleCheck"
				:label="t('tasks.bulk.complete')"
				@click="run(() => actions.bulkUpdate(tasks, {done: true}))"
			/>
			<UiMenu
				:items="dueItems"
				:title="t('tasks.actions.dueHeading')"
				side="top"
			>
				<template #trigger>
					<UiIconButton
						:icon="CalendarDays"
						:label="t('tasks.actions.dueHeading')"
					/>
				</template>
			</UiMenu>
			<UiMenu
				:items="priorityItems"
				:title="t('taskDetail.properties.priority')"
				side="top"
			>
				<template #trigger>
					<UiIconButton
						:icon="Flag"
						:label="t('taskDetail.properties.priority')"
					/>
				</template>
			</UiMenu>
			<UiAdaptivePopover
				v-model:open="moveOpen"
				:title="t('tasks.bulk.move')"
				side="top"
				align="end"
			>
				<template #trigger>
					<UiIconButton
						:icon="FolderInput"
						:label="t('tasks.bulk.move')"
					/>
				</template>
				<ProjectPicker
					:model-value="0"
					@select="moveTo"
				/>
			</UiAdaptivePopover>
			<UiIconButton
				:icon="Trash2"
				:label="t('tasks.actions.delete')"
				class="text-danger"
				@click="remove"
			/>
		</div>
	</Transition>
</template>
