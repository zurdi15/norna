<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute, useRouter} from 'vue-router'
import {useQuery} from '@tanstack/vue-query'
import {CalendarOff, History} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {everyTaskQuery} from '@/client/queries/tasks'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {useTitle} from '@/composables/useTitle'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import TaskList, {type TaskListGroup} from '@/features/tasks/TaskList.vue'
import TaskListSkeleton from '@/features/tasks/TaskListSkeleton.vue'
import {startOfDay} from '@/helpers/time/dateMath'
import {getTaskDate} from '@/modules/task/task'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSegmented from '@/ui/UiSegmented.vue'

/**
 * What's coming, day by day. The range lives in the url (from/to take dates or
 * date math like "now+7d"), so a view like "the next 30 days with overdue" can be bookmarked.
 */
const props = defineProps<{
	dateFrom: Date | string
	dateTo: Date | string
	showNulls: boolean
	showOverdue: boolean
}>()

defineOptions({inheritAttrs: false})

const {t, locale} = useI18n()
const route = useRoute()
const router = useRouter()
const dates = useTaskDateFormat()
useTitle(() => t('upcoming.title'))

const RANGES = {
	next7Days: ['now', 'now+7d'],
	next14Days: ['now', 'now+14d'],
	next30Days: ['now', 'now+30d'],
} as const
type RangeKey = keyof typeof RANGES

const asQueryValue = (value: Date | string) => value instanceof Date ? value.toISOString() : value

// No query means the route's default of a week from now.
const range = computed<RangeKey | 'custom'>(() => {
	if (route.query.from === undefined && route.query.to === undefined) {
		return 'next7Days'
	}
	const match = (Object.keys(RANGES) as RangeKey[])
		.find(key => RANGES[key][0] === asQueryValue(props.dateFrom) && RANGES[key][1] === asQueryValue(props.dateTo))
	return match ?? 'custom'
})

const rangeItems = computed(() => [
	...(Object.keys(RANGES) as RangeKey[]).map(key => ({value: key, label: t(`upcoming.ranges.${key}`)})),
	...(range.value === 'custom' ? [{value: 'custom' as const, label: t('upcoming.ranges.custom')}] : []),
])

function update(query: Partial<{from: string, to: string, showOverdue: boolean, showNulls: boolean}>) {
	void router.replace({
		name: 'tasks.range',
		query: {
			from: query.from ?? asQueryValue(props.dateFrom),
			to: query.to ?? asQueryValue(props.dateTo),
			showOverdue: String(query.showOverdue ?? props.showOverdue),
			showNulls: String(query.showNulls ?? props.showNulls),
		},
	})
}

function pickRange(key: RangeKey | 'custom') {
	if (key !== 'custom') {
		update({from: RANGES[key][0], to: RANGES[key][1]})
	}
}

const filter = computed(() => {
	const parts = ['done = false', `due_date < '${asQueryValue(props.dateTo)}'`]
	if (!props.showOverdue) {
		parts.push(`due_date > '${asQueryValue(props.dateFrom)}'`)
	}
	return parts.join(' && ')
})

const tasks = useQuery(computed(() => everyTaskQuery({
	filter: filter.value,
	filter_include_nulls: props.showNulls,
	sort_by: ['due_date', 'id'],
	order_by: ['asc', 'desc'],
	expand: ['comment_count', 'is_unread'],
})))

const relativeDay = computed(() => new Intl.RelativeTimeFormat(locale.value, {numeric: 'auto'}))

// Overdue first, then one group per day, then the tasks without a date.
const groups = computed<TaskListGroup[]>(() => {
	const today = startOfDay(dates.now.value).getTime()
	const overdue: Task[] = []
	const undated: Task[] = []
	const byDay = new Map<number, Task[]>()
	for (const task of tasks.data.value ?? []) {
		const due = getTaskDate(task.due_date)
		if (!due) {
			undated.push(task)
		} else if (startOfDay(due).getTime() < today) {
			overdue.push(task)
		} else {
			const day = startOfDay(due).getTime()
			byDay.set(day, [...(byDay.get(day) ?? []), task])
		}
	}
	return [
		{key: 'overdue', title: t('agenda.overdue'), tone: 'danger' as const, tasks: overdue},
		...[...byDay.entries()].map(([day, dayTasks]) => {
			const date = new Date(day)
			const distance = Math.round((day - today) / 86_400_000)
			return {
				key: String(day),
				title: dates.long(date),
				caption: distance < 7 ? relativeDay.value.format(distance, 'day') : undefined,
				tasks: dayTasks,
			}
		}),
		{key: 'undated', title: t('upcoming.undated'), tasks: undated},
	]
})
</script>

<template>
	<PageHeader
		:title="t('upcoming.title')"
		large
	>
		<template #actions>
			<MobileRootActions />
		</template>
		<template #below>
			<div class="flex scrollbar-none items-center gap-2 overflow-x-auto px-4 pb-3 lg:px-6">
				<UiSegmented
					:model-value="range"
					:items="rangeItems"
					:label="t('upcoming.range')"
					class="shrink-0"
					@update:modelValue="pickRange"
				/>
				<UiChip
					as="button"
					:pressed="showOverdue"
					:icon="History"
					class="shrink-0"
					@click="update({showOverdue: !showOverdue})"
				>
					{{ t('upcoming.showOverdue') }}
				</UiChip>
				<UiChip
					as="button"
					:pressed="showNulls"
					:icon="CalendarOff"
					class="shrink-0"
					@click="update({showNulls: !showNulls})"
				>
					{{ t('upcoming.showUndated') }}
				</UiChip>
			</div>
		</template>
	</PageHeader>

	<div class="pb-10">
		<TaskListSkeleton v-if="tasks.isPending.value" />
		<UiEmptyState
			v-else-if="tasks.isError.value"
			:title="t('agenda.loadFailed')"
		>
			<template #actions>
				<UiButton @click="tasks.refetch()">
					{{ t('agenda.retry') }}
				</UiButton>
			</template>
		</UiEmptyState>
		<TaskList
			v-else
			:groups="groups"
		>
			<template #empty>
				<UiEmptyState
					:title="t('upcoming.emptyTitle')"
					:description="t('upcoming.emptyDescription')"
				/>
			</template>
		</TaskList>
	</div>
</template>
