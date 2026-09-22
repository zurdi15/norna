<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'

import type {Task} from '@/client/generated'
import {cn} from '@/ui/cn'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

import {useTaskSelection} from './selection'
import TaskRow from './TaskRow.vue'
import {useTaskListKeyboard} from './useTaskListKeyboard'

export interface TaskListGroup {
	key: string
	title?: string
	// Mono label over the title, e.g. the Norn of a time block.
	caption?: string
	tone?: 'default' | 'danger'
	tasks: readonly Task[]
	// Shown even without tasks, e.g. "Today" on the home page.
	keepWhenEmpty?: boolean
}

/** Task rows in titled groups, with one keyboard cursor across all of them. */
const props = withDefaults(defineProps<{
	groups: readonly TaskListGroup[]
	showProject?: boolean
	// Only one list per page should listen to j/k.
	keyboard?: boolean
	class?: HTMLAttributes['class']
}>(), {
	showProject: true,
	keyboard: true,
	class: undefined,
})

const visibleGroups = computed(() => props.groups.filter(group => group.tasks.length > 0 || group.keepWhenEmpty))
const allTasks = computed(() => visibleGroups.value.flatMap(group => group.tasks))
const selection = useTaskSelection()
const {activeId} = useTaskListKeyboard(allTasks, computed(() => props.keyboard), selection && (task => selection.toggle(task)))
</script>

<template>
	<div :class="cn('@container grid', props.class)">
		<section
			v-for="group in visibleGroups"
			:key="group.key"
			class="pb-2"
		>
			<UiSectionHeading
				v-if="group.title"
				:title="group.title"
				:caption="group.caption"
				:count="group.tasks.length"
				:tone="group.tone"
				class="px-4 pt-4 pb-1.5 @xl:px-6"
			/>
			<ul
				v-if="group.tasks.length"
				role="list"
			>
				<!-- Hairlines between rows start after the check, like threads under the text. -->
				<li
					v-for="task in group.tasks"
					:key="task.id"
					:data-task-row="task.id"
					class="
						relative isolate
						before:absolute before:inset-s-11.5 before:inset-e-0 before:top-0 before:z-10 before:h-px
						before:bg-line
						first:before:hidden
					"
				>
					<TaskRow
						:task="task"
						:show-project="showProject"
						:active="activeId === task.id"
					/>
				</li>
			</ul>
			<slot
				v-else
				name="group-empty"
				:group="group"
			/>
		</section>
		<slot
			v-if="!visibleGroups.length"
			name="empty"
		/>
	</div>
</template>
