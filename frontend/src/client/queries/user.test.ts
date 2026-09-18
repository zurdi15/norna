import {QueryClient} from '@tanstack/vue-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({
	userTimezones: vi.fn(),
	userUpdateSettings: vi.fn(),
	userUpdateEmail: vi.fn(),
	userResendEmailConfirmation: vi.fn(),
	userCancelEmailUpdate: vi.fn(),
	userChangePassword: vi.fn(),
}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {error, success} from '@/message'
import {parseUserSettings} from '@/modules/settings/userSettings'

import {
	applySettingsPatch,
	changePasswordMutationOptions,
	revertSettingsPatch,
	timezonesQuery,
	updateEmailMutationOptions,
	updateUserSettings,
	userSettingsBody,
} from './user'

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

const base = parseUserSettings({
	name: 'Ana',
	language: 'es-ES',
	timezone: 'Europe/Madrid',
	frontend_settings: {play_sound_when_done: true, time_format: '24h', someday_setting: 'kept'},
	extra_settings_links: {handbook: {text: 'Handbook', url: 'https://example.test'}},
})

describe('time zones', () => {
	it('sorts the list and treats null as empty', async () => {
		sdk.userTimezones.mockResolvedValueOnce({data: ['Europe/Madrid', 'America/Lima', 'Asia/Tokyo']})
		expect(await client.fetchQuery(timezonesQuery())).toEqual(['America/Lima', 'Asia/Tokyo', 'Europe/Madrid'])

		const other = new QueryClient()
		sdk.userTimezones.mockResolvedValueOnce({data: null})
		expect(await other.fetchQuery(timezonesQuery())).toEqual([])
	})
})

describe('settings patches', () => {
	it('merges frontend settings key by key', () => {
		const next = applySettingsPatch(base, {name: 'Ana B', frontend_settings: {play_sound_when_done: false}})
		expect(next.name).toBe('Ana B')
		expect(next.frontend_settings.play_sound_when_done).toBe(false)
		expect(next.frontend_settings.time_format).toBe('24h')
		expect((next.frontend_settings as unknown as Record<string, unknown>).someday_setting).toBe('kept')
		expect(base.name).toBe('Ana')
	})

	it('reverts only what a later change has not replaced', () => {
		const first = {timezone: 'Asia/Tokyo', frontend_settings: {play_sound_when_done: false}}
		const afterFirst = applySettingsPatch(base, first)
		// A second change touched the time zone again before the first one failed.
		const afterSecond = applySettingsPatch(afterFirst, {timezone: 'America/Lima', name: 'Bea'})

		const reverted = revertSettingsPatch(afterSecond, first, base)
		expect(reverted.timezone).toBe('America/Lima')
		expect(reverted.name).toBe('Bea')
		expect(reverted.frontend_settings.play_sound_when_done).toBe(true)
	})

	it('compares arrays by value when reverting', () => {
		const reminders = [{relative_period: -3600, relative_to: 'due_date' as const}]
		const patch = {frontend_settings: {quick_add_default_reminders: reminders}}
		const changed = applySettingsPatch(base, patch)
		const reparsed = {...changed, frontend_settings: {...changed.frontend_settings, quick_add_default_reminders: [...reminders]}}
		expect(revertSettingsPatch(reparsed, patch, base).frontend_settings.quick_add_default_reminders).toEqual([])
	})

	it('sends every writable setting but no server-controlled links', async () => {
		sdk.userUpdateSettings.mockResolvedValue({data: {}})
		await updateUserSettings(base, false)
		const body = sdk.userUpdateSettings.mock.calls[0]?.[0].body
		expect(body).not.toHaveProperty('extra_settings_links')
		expect(body.language).toBe('es-ES')
		expect(body.frontend_settings.someday_setting).toBe('kept')
		expect(body.timezone).toBe('Europe/Madrid')
	})

	it('leaves the language out on demo servers', () => {
		expect(userSettingsBody(base, true).language).toBeUndefined()
	})
})

describe('email and password', () => {
	it('trims the new email and forgets the password', async () => {
		sdk.userUpdateEmail.mockResolvedValue({data: {}})
		const options = updateEmailMutationOptions()
		expect(options.gcTime).toBe(0)
		await client.getMutationCache().build(client, options).execute({new_email: ' new@example.test ', password: 'secret'})
		expect(sdk.userUpdateEmail).toHaveBeenCalledExactlyOnceWith({body: {new_email: 'new@example.test', password: 'secret'}})
	})

	it('leaves password errors to the form', async () => {
		const cause = {status: 403, code: 1011}
		sdk.userChangePassword.mockRejectedValue(cause)
		const options = changePasswordMutationOptions()
		expect(options.gcTime).toBe(0)
		await expect(client.getMutationCache().build(client, options).execute({old_password: 'a', new_password: 'b'})).rejects.toBe(cause)
		expect(error).not.toHaveBeenCalled()
		expect(success).not.toHaveBeenCalled()
	})
})
