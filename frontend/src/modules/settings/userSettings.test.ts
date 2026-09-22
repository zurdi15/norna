import {beforeEach, describe, expect, it, vi} from 'vitest'

import {PrefixMode} from '@/modules/quickAddMagic/prefixes'

import {
	DEFAULT_FRONTEND_SETTINGS,
	mergeFrontendSettings,
	parseFrontendSettings,
	parseUserSettings,
} from './userSettings'

describe('parseFrontendSettings', () => {
	it('returns the defaults for a missing or malformed blob', () => {
		expect(parseFrontendSettings(undefined)).toEqual(DEFAULT_FRONTEND_SETTINGS)
		expect(parseFrontendSettings('nonsense')).toEqual(DEFAULT_FRONTEND_SETTINGS)
		expect(parseFrontendSettings([1, 2])).toEqual(DEFAULT_FRONTEND_SETTINGS)
	})

	it('reads the snake_case keys the previous frontend stored', () => {
		const settings = parseFrontendSettings({color_schema: 'dark', quick_add_magic_mode: 'todoist'})

		expect(settings.color_schema).toBe('dark')
		expect(settings.quick_add_magic_mode).toBe('todoist')
		expect(settings.play_sound_when_done).toBe(true)
	})

	it('also reads camelCase keys, recursively', () => {
		const settings = parseFrontendSettings({
			colorSchema: 'light',
			quickAddDefaultReminders: [{relativePeriod: -3600, relativeTo: 'due_date'}],
		})

		expect(settings.color_schema).toBe('light')
		expect(settings.quick_add_default_reminders).toEqual([{relative_period: -3600, relative_to: 'due_date'}])
	})

	it('ignores values of the wrong type', () => {
		const settings = parseFrontendSettings({play_sound_when_done: 'yes', quick_add_default_reminders: 'none'})

		expect(settings.play_sound_when_done).toBe(true)
		expect(settings.quick_add_default_reminders).toEqual([])
	})

	it('falls back to the default quick add mode for one it does not know', () => {
		expect(parseFrontendSettings({quick_add_magic_mode: 'a-retired-mode'}).quick_add_magic_mode).toBe(PrefixMode.Default)
		expect(parseFrontendSettings({quick_add_magic_mode: PrefixMode.Todoist}).quick_add_magic_mode).toBe(PrefixMode.Todoist)
	})

	it('accepts null for nullable settings', () => {
		expect(parseFrontendSettings({sidebar_width: 320}).sidebar_width).toBe(320)
		expect(parseFrontendSettings({background_brightness: null}).background_brightness).toBeNull()
	})

	it('reads what was stored under a setting\'s old name', () => {
		expect(parseFrontendSettings({task_type_label_ids: [3, 1]}).featured_label_ids).toEqual([3, 1])
	})

	it('prefers the current name when both are stored', () => {
		expect(parseFrontendSettings({task_type_label_ids: [3], featured_label_ids: [7]}).featured_label_ids).toEqual([7])
	})

	it('keeps optional settings that have no default', () => {
		expect(parseFrontendSettings({default_due_time: '09:00'}).default_due_time).toBe('09:00')
	})
})

describe('mergeFrontendSettings', () => {
	it('keeps keys this frontend does not know about', () => {
		const merged = mergeFrontendSettings({some_future_key: 1, color_schema: 'dark'}, {color_schema: 'light'})

		expect(merged).toEqual({some_future_key: 1, color_schema: 'light'})
	})

	it('drops a setting\'s old name once it is saved again', () => {
		const merged = mergeFrontendSettings({task_type_label_ids: [3]}, {})
		expect(merged.featured_label_ids).toEqual([3])
		expect('task_type_label_ids' in merged).toBe(false)
	})

	it('normalizes camelCase keys so the patch replaces them', () => {
		const merged = mergeFrontendSettings({colorSchema: 'dark'}, {color_schema: 'light'})

		expect(merged).toEqual({color_schema: 'light'})
	})

	it('starts from an empty blob when nothing is stored', () => {
		expect(mergeFrontendSettings(null, {show_last_viewed: false})).toEqual({show_last_viewed: false})
	})
})

describe('parseUserSettings', () => {
	beforeEach(() => {
		vi.stubGlobal('navigator', {language: 'es-ES'})
	})

	it('falls back to the browser language when none was ever set', () => {
		expect(parseUserSettings({language: ''}).language).toBe('es-ES')
		expect(parseUserSettings(undefined).language).toBe('es-ES')
	})

	it('keeps the language returned by the api', () => {
		expect(parseUserSettings({language: 'en'}).language).toBe('en')
	})

	it('clamps an out-of-range week start to Sunday', () => {
		expect(parseUserSettings({week_start: 9}).week_start).toBe(0)
		expect(parseUserSettings({week_start: 1}).week_start).toBe(1)
	})

	it('parses the embedded frontend settings', () => {
		expect(parseUserSettings({frontend_settings: {color_schema: 'dark'}}).frontend_settings.color_schema).toBe('dark')
	})
})
