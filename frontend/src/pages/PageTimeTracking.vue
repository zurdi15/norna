<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {keepPreviousData, useQuery} from '@tanstack/vue-query'
import {CalendarRange, Plus, Timer} from '@lucide/vue'

import type {Task, TimeEntry} from '@/client/generated'
import {timeEntriesQuery} from '@/client/queries/timeEntries'
import {useTimerEvents} from '@/composables/useActiveTimer'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {useTitle} from '@/composables/useTitle'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import ActiveTimerCard from '@/features/time-tracking/ActiveTimerCard.vue'
import DayChip from '@/features/time-tracking/DayChip.vue'
import {formatDuration, totalSeconds} from '@/features/time-tracking/duration'
import ProjectFilter from '@/features/time-tracking/ProjectFilter.vue'
import {entriesFilter, groupByDay, RANGE_PRESETS} from '@/features/time-tracking/ranges'
import TimeEntryDialog from '@/features/time-tracking/TimeEntryDialog.vue'
import TimeEntryRow from '@/features/time-tracking/TimeEntryRow.vue'
import {useDeleteTimeEntry} from '@/features/time-tracking/useDeleteTimeEntry'
import {useEntryTasks} from '@/features/time-tracking/useEntryTasks'
import {useTimeTrackingFilters} from '@/features/time-tracking/useTimeTrackingFilters'
import {isSameDay, startOfDay} from '@/helpers/time/dateMath'
import {useAuthStore} from '@/stores/auth'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

defineOptions({inheritAttrs: false})

/** Tracked time: the running timer on top, then the user's own entries in a range, day by day. */
const {t, locale} = useI18n()
useTitle(() => t('timeTracking.title'))
useTimerEvents()

const authStore = useAuthStore()
const dates = useTaskDateFormat()
const {now} = useGlobalNow()
const filters = useTimeTrackingFilters()
const deleteEntry = useDeleteTimeEntry()

const userId = computed(() => authStore.info?.id ?? 0)
// The range is in local days, so the server reads them in the browser's zone.
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const entriesQuery = useQuery(computed(() => ({
	...timeEntriesQuery({
		filter: entriesFilter({range: filters.range.value, userId: userId.value, projectIds: filters.projectIds.value}),
		filter_timezone: timezone,
	}),
	enabled: userId.value > 0,
	placeholderData: keepPreviousData,
})))
const entries = computed(() => entriesQuery.data.value ?? [])
const tasks = useEntryTasks(entries)
const groups = computed(() => groupByDay(entries.value, now.value))
const total = computed(() => totalSeconds(entries.value, now.value))

// The tasks tracked most recently come first when picking one.
const recentTasks = computed(() => groups.value
	.flatMap(group => group.entries)
	.map(entry => tasks.value.get(entry.task_id ?? 0))
	.filter((task, index, all): task is Task => task !== undefined && all.indexOf(task) === index)
	.slice(0, 5))

// A new entry picks up where today's last one ended.
const suggestedStart = computed(() => entries.value
	.map(entry => entry.end_time ? new Date(entry.end_time) : null)
	.filter((end): end is Date => end !== null && isSameDay(end, now.value))
	.sort((a, b) => b.getTime() - a.getTime())[0] ?? null)

const dialogOpen = ref(false)
const editing = ref<TimeEntry | null>(null)

function logTime() {
	editing.value = null
	dialogOpen.value = true
}

function edit(entry: TimeEntry) {
	editing.value = entry
	dialogOpen.value = true
}

const rangeItems = computed(() => [
	...RANGE_PRESETS.map(value => ({value, label: t(`timeTracking.ranges.${value}`)})),
	// Only the icon, so the four fit a phone's width.
	{value: 'custom' as const, label: t('timeTracking.ranges.custom'), icon: CalendarRange, iconOnly: true},
])

const fromDay = computed({
	get: () => filters.range.value.from,
	set: (day: Date) => filters.setCustom(day, filters.lastDay.value),
})
const toDay = computed({
	get: () => filters.lastDay.value,
	set: (day: Date) => filters.setCustom(filters.range.value.from, day),
})

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, {day: 'numeric', month: 'short'}))
const rangeText = computed(() => dayFormat.value.formatRange(filters.range.value.from, filters.lastDay.value))

const relativeDay = computed(() => new Intl.RelativeTimeFormat(locale.value, {numeric: 'auto'}))
function dayCaption(day: Date): string | undefined {
	const distance = Math.round((startOfDay(now.value).getTime() - day.getTime()) / 86_400_000)
	return distance >= 0 && distance <= 1 ? relativeDay.value.format(-distance, 'day') : undefined
}

const isOwn = (entry: TimeEntry) => entry.user_id === userId.value
</script>

<template>
	<PageHeader
		:title="t('timeTracking.title')"
		large
	>
		<template #actions>
			<UiButton
				variant="primary"
				size="sm"
				:icon="Plus"
				@click="logTime"
			>
				{{ t('timeTracking.logTime') }}
			</UiButton>
			<MobileRootActions />
		</template>
		<template #below>
			<div class="flex flex-wrap items-center gap-2 px-4 pb-3 lg:px-6">
				<UiSegmented
					:model-value="filters.preset.value"
					:items="rangeItems"
					:label="t('timeTracking.ranges.label')"
					class="shrink-0"
					@update:modelValue="filters.setPreset"
				/>
				<template v-if="filters.preset.value === 'custom'">
					<DayChip
						v-model="fromDay"
						:title="t('timeTracking.ranges.from')"
						:text="t('timeTracking.ranges.fromDay', {day: dayFormat.format(fromDay)})"
					/>
					<DayChip
						v-model="toDay"
						:title="t('timeTracking.ranges.to')"
						:text="t('timeTracking.ranges.toDay', {day: dayFormat.format(toDay)})"
					/>
				</template>
				<ProjectFilter v-model="filters.projectId.value" />
			</div>
		</template>
	</PageHeader>

	<div class="@container mx-auto grid max-w-4xl gap-6 pt-4 pb-10 md:pt-6">
		<div class="px-4 @2xl:px-6">
			<ActiveTimerCard :recent-tasks="recentTasks" />
		</div>

		<section :aria-label="t('timeTracking.entries')">
			<div class="flex items-end gap-4 px-4 pb-1 @2xl:px-6">
				<div class="min-w-0 flex-1">
					<p class="caption">
						{{ t('timeTracking.total') }}
					</p>
					<p class="mt-0.5 truncate font-mono text-xs text-ink-muted">
						{{ rangeText }}
					</p>
				</div>
				<p
					class="font-mono text-2xl font-medium tracking-tight tabular-nums"
					data-time-total
				>
					{{ formatDuration(total) }}
				</p>
			</div>

			<UiAlert
				v-if="entriesQuery.isError.value"
				tone="danger"
				class="mx-4 mt-4 @2xl:mx-6"
			>
				{{ t('timeTracking.loadFailed') }}
			</UiAlert>
			<div
				v-else-if="entriesQuery.isPending.value"
				class="grid gap-4 px-4 pt-6 @2xl:px-6"
				aria-hidden="true"
			>
				<UiSkeleton
					v-for="index in 4"
					:key="index"
					class="h-8"
				/>
			</div>
			<UiEmptyState
				v-else-if="!groups.length"
				:title="t('timeTracking.emptyTitle')"
				:description="t('timeTracking.emptyDescription')"
				class="py-16"
			>
				<template #illustration>
					<UiIcon
						:icon="Timer"
						size="xl"
						class="mb-4 text-ink-faint"
					/>
				</template>
			</UiEmptyState>
			<template v-else>
				<section
					v-for="group in groups"
					:key="group.key"
					class="pb-2"
				>
					<UiSectionHeading
						:title="dates.long(group.day)"
						:caption="dayCaption(group.day)"
						as="h3"
						class="px-4 pt-4 pb-1 @2xl:px-6"
					>
						<template #actions>
							<span class="font-mono text-xs text-ink-muted tabular-nums">{{ formatDuration(group.seconds) }}</span>
						</template>
					</UiSectionHeading>
					<ul role="list">
						<li
							v-for="entry in group.entries"
							:key="entry.id"
							class="
								relative
								before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-line
								first:before:hidden
								@2xl:before:inset-x-6
							"
						>
							<TimeEntryRow
								:entry="entry"
								:task="tasks.get(entry.task_id ?? 0)"
								:editable="isOwn(entry)"
								:now="now"
								@edit="edit(entry)"
								@delete="deleteEntry(entry)"
							/>
						</li>
					</ul>
				</section>
			</template>
		</section>
	</div>

	<TimeEntryDialog
		v-model:open="dialogOpen"
		:entry="editing"
		:task="editing ? tasks.get(editing.task_id ?? 0) : null"
		:recent-tasks="recentTasks"
		:suggested-start="suggestedStart"
		@delete="deleteEntry"
	/>
</template>
