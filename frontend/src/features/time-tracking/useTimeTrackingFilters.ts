import {computed} from 'vue'
import {useRouteQuery} from '@vueuse/router'

import {useGlobalNow} from '@/composables/useGlobalNow'
import {useProjects} from '@/composables/useProjects'
import {addDays} from '@/helpers/time/dateMath'
import {useAuthStore} from '@/stores/auth'

import {customRange, dayKey, parseDayKey, presetRange, RANGE_PRESETS, type DayRange, type RangePreset} from './ranges'

const isPreset = (value: unknown): value is RangePreset => RANGE_PRESETS.includes(value as RangePreset)

/**
 * The time tracking page's range and project, kept in the url so a reload or a shared
 * link shows the same entries: ?range=lastWeek, ?from=2026-09-01&to=2026-09-14, ?project=5.
 */
export function useTimeTrackingFilters() {
	const authStore = useAuthStore()
	const projects = useProjects()
	const {now} = useGlobalNow()

	const rangeQuery = useRouteQuery<string | undefined>('range')
	const fromQuery = useRouteQuery<string | undefined>('from')
	const toQuery = useRouteQuery<string | undefined>('to')
	const projectQuery = useRouteQuery<string | undefined>('project')

	const weekStart = computed(() => authStore.settings.week_start)

	const customDays = computed(() => {
		const from = parseDayKey(fromQuery.value)
		const to = parseDayKey(toQuery.value)
		return from && to ? {from, to} : null
	})

	const preset = computed<RangePreset | 'custom'>(() => {
		if (customDays.value) {
			return 'custom'
		}
		return isPreset(rangeQuery.value) ? rangeQuery.value : 'thisWeek'
	})

	const range = computed<DayRange>(() => customDays.value
		? customRange(customDays.value.from, customDays.value.to)
		: presetRange(preset.value === 'custom' ? 'thisWeek' : preset.value, now.value, weekStart.value))

	/** The last day in the range (the range's end is the day after). */
	const lastDay = computed(() => addDays(range.value.to, -1))

	function setPreset(value: RangePreset | 'custom') {
		if (value === 'custom') {
			// A custom range starts from the one on screen.
			setCustom(range.value.from, lastDay.value)
			return
		}
		fromQuery.value = undefined
		toQuery.value = undefined
		rangeQuery.value = value === 'thisWeek' ? undefined : value
	}

	function setCustom(from: Date, to: Date) {
		const days = customRange(from, to)
		rangeQuery.value = undefined
		fromQuery.value = dayKey(days.from)
		toQuery.value = dayKey(addDays(days.to, -1))
	}

	const projectId = computed({
		get: () => {
			const id = Number(projectQuery.value)
			return Number.isInteger(id) && id > 0 ? id : 0
		},
		set: (id: number) => {
			projectQuery.value = id > 0 ? String(id) : undefined
		},
	})

	// A project's sub-projects count as part of it.
	function withDescendants(id: number): number[] {
		return [id, ...projects.getChildProjects(id).flatMap(child => withDescendants(child.id))]
	}
	const projectIds = computed(() => projectId.value > 0 ? withDescendants(projectId.value) : [])

	return {
		preset,
		range,
		lastDay,
		setPreset,
		setCustom,
		projectId,
		projectIds,
	}
}
