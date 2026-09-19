<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {CalendarClock, Check, Folder} from '@lucide/vue'

import type {PreviewResult} from '@/client/generated'
import PriorityMark from '@/features/tasks/PriorityMark.vue'
import {cn} from '@/ui/cn'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'

/** The first tasks of a CSV import as the server would create them. */
const props = defineProps<{
	preview: PreviewResult
}>()

const {t} = useI18n()

const tasks = computed(() => props.preview.tasks ?? [])
const total = computed(() => props.preview.total_rows ?? 0)
const more = computed(() => Math.max(0, total.value - tasks.value.length))
</script>

<template>
	<div class="grid gap-2">
		<ul
			v-if="tasks.length"
			role="list"
			class="divide-y divide-line rounded-lg border border-line bg-surface"
		>
			<li
				v-for="(task, index) in tasks"
				:key="index"
				class="flex gap-3 px-3 py-2.5"
			>
				<span
					:class="cn(
						'mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border',
						task.done ? 'border-accent bg-accent text-on-accent' : 'border-line-strong',
					)"
					:aria-label="task.done ? t('migration.csv.preview.done') : undefined"
					:role="task.done ? 'img' : undefined"
				>
					<UiIcon
						v-if="task.done"
						:icon="Check"
						size="xs"
						:stroke="2.5"
					/>
				</span>
				<div class="grid min-w-0 flex-1 gap-1">
					<p
						:class="cn('text-base wrap-break-word', task.done && 'text-ink-muted line-through', !task.title && `
							text-ink-faint italic
						`)"
					>
						{{ task.title || t('migration.csv.preview.untitled') }}
					</p>
					<p
						v-if="task.description"
						class="line-clamp-2 text-sm text-ink-muted"
					>
						{{ task.description }}
					</p>
					<div
						v-if="task.priority || task.due_date || task.start_date || task.labels?.length || task.project"
						class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-faint"
					>
						<PriorityMark
							v-if="task.priority"
							:priority="task.priority"
						/>
						<span
							v-if="task.due_date || task.start_date"
							class="inline-flex items-center gap-1 font-mono text-2xs"
						>
							<UiIcon
								:icon="CalendarClock"
								size="xs"
							/>
							<template v-if="task.start_date">{{ task.start_date }}</template>
							<template v-if="task.start_date && task.due_date"> → </template>
							<template v-if="task.due_date">{{ task.due_date }}</template>
						</span>
						<span
							v-if="task.project"
							class="inline-flex min-w-0 items-center gap-1"
						>
							<UiIcon
								:icon="Folder"
								size="xs"
							/>
							<span class="truncate">{{ task.project }}</span>
						</span>
						<UiChip
							v-for="label in task.labels ?? []"
							:key="label"
							size="sm"
						>
							{{ label }}
						</UiChip>
					</div>
				</div>
			</li>
		</ul>
		<p
			v-if="more"
			class="px-1 text-sm text-ink-faint"
		>
			{{ t('migration.csv.preview.more', more) }}
		</p>
	</div>
</template>
