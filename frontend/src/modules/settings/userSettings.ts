import type {BasicColorSchema} from '@vueuse/core'

import type {UserGeneralSettings} from '@/client/generated'
import {DATE_DISPLAY, type DateDisplay} from '@/constants/dateDisplay'
import {TIME_FORMAT, type TimeFormat} from '@/constants/timeFormat'
import {DEFAULT_PROJECT_VIEW_SETTINGS, type DefaultProjectViewKind} from '@/constants/projectView'
import {PRIORITIES, type Priority} from '@/constants/priorities'
import {getBrowserLanguage, type SupportedLocale} from '@/i18n'
// From the leaf module: the package index pulls in the date parser, which imports the auth store.
import {PrefixMode} from '@/modules/quickAddMagic/prefixes'
import {RELATION_KIND, type IRelationKind} from '@/types/IRelationKind'
import type {IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'

export interface QuickAddDefaultReminder {
	relative_period: number
	relative_to: IReminderPeriodRelativeTo | null
}

/**
 * The frontend's own preferences, stored by the API as an opaque JSON blob in
 * `frontend_settings`. The previous frontend deep-snake-cased it on save, so the
 * stored keys are snake_case; they stay that way here.
 */
export interface FrontendSettings {
	play_sound_when_done: boolean
	quick_add_magic_mode: PrefixMode
	color_schema: BasicColorSchema
	allow_icon_changes: boolean
	filter_id_used_on_overview: number | null
	default_view: DefaultProjectViewKind
	minimum_priority: Priority
	date_display: DateDisplay
	time_format: TimeFormat
	default_task_relation_type: IRelationKind
	background_brightness: number | null
	always_show_bucket_task_count: boolean
	show_last_viewed: boolean
	sidebar_width: number | null
	comment_sort_order: 'asc' | 'desc'
	desktop_quick_entry_shortcut: string
	quick_add_default_reminders: QuickAddDefaultReminder[]
	time_tracking_default_start?: string
	default_due_time?: string
}

export const DEFAULT_FRONTEND_SETTINGS: Readonly<FrontendSettings> = Object.freeze({
	play_sound_when_done: true,
	quick_add_magic_mode: PrefixMode.Default,
	color_schema: 'auto',
	allow_icon_changes: true,
	filter_id_used_on_overview: null,
	default_view: DEFAULT_PROJECT_VIEW_SETTINGS.FIRST,
	minimum_priority: PRIORITIES.MEDIUM,
	date_display: DATE_DISPLAY.RELATIVE,
	time_format: TIME_FORMAT.HOURS_24,
	default_task_relation_type: RELATION_KIND.RELATED,
	background_brightness: 100,
	always_show_bucket_task_count: false,
	show_last_viewed: true,
	sidebar_width: null,
	comment_sort_order: 'asc',
	desktop_quick_entry_shortcut: 'CmdOrCtrl+Shift+A',
	quick_add_default_reminders: [],
})

export interface UserSettings extends Omit<Required<UserGeneralSettings>, '$schema' | 'frontend_settings' | 'language' | 'week_start'> {
	language: SupportedLocale | string
	week_start: 0 | 1 | 2 | 3 | 4 | 5 | 6
	frontend_settings: FrontendSettings
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toSnakeKey(key: string): string {
	return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

// Any camelCase keys (older or hand-edited blobs) become snake_case, recursively.
function snakeKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(snakeKeys)
	}
	if (!isPlainObject(value)) {
		return value
	}
	return Object.fromEntries(Object.entries(value).map(([key, v]) => [toSnakeKey(key), snakeKeys(v)]))
}

/**
 * Reads the stored blob over the defaults. A stored value only wins when it has the
 * same type as the default (null counts as matching for nullable settings), so a
 * malformed blob can't break the app.
 */
export function parseFrontendSettings(raw: unknown): FrontendSettings {
	const stored = snakeKeys(raw)
	const settings: Record<string, unknown> = {...DEFAULT_FRONTEND_SETTINGS}
	if (!isPlainObject(stored)) {
		return settings as unknown as FrontendSettings
	}
	for (const [key, value] of Object.entries(stored)) {
		const fallback = (DEFAULT_FRONTEND_SETTINGS as Record<string, unknown>)[key]
		if (value === undefined) {
			continue
		}
		if (fallback === undefined || fallback === null || value === null || typeof value === typeof fallback) {
			settings[key] = Array.isArray(fallback) && !Array.isArray(value) ? fallback : value
		}
	}
	return settings as unknown as FrontendSettings
}

/**
 * The blob to send when saving: the stored blob with the patch applied. The API
 * replaces the whole blob, so keys this frontend doesn't know are carried over.
 */
export function mergeFrontendSettings(raw: unknown, patch: Partial<FrontendSettings>): Record<string, unknown> {
	const stored = snakeKeys(raw)
	return {
		...(isPlainObject(stored) ? stored : {}),
		...patch,
	}
}

export function parseUserSettings(raw: UserGeneralSettings | undefined | null): UserSettings {
	const weekStart = raw?.week_start ?? 0
	return {
		name: raw?.name ?? '',
		default_project_id: raw?.default_project_id ?? 0,
		discoverable_by_email: raw?.discoverable_by_email ?? false,
		discoverable_by_name: raw?.discoverable_by_name ?? false,
		email_reminders_enabled: raw?.email_reminders_enabled ?? true,
		extra_settings_links: raw?.extra_settings_links ?? {},
		// The API sends '' when no language was ever set.
		language: raw?.language || getBrowserLanguage(),
		overdue_tasks_reminders_enabled: raw?.overdue_tasks_reminders_enabled ?? true,
		overdue_tasks_reminders_time: raw?.overdue_tasks_reminders_time ?? '',
		timezone: raw?.timezone ?? '',
		week_start: (weekStart >= 0 && weekStart <= 6 ? weekStart : 0) as UserSettings['week_start'],
		frontend_settings: parseFrontendSettings(raw?.frontend_settings),
	}
}
