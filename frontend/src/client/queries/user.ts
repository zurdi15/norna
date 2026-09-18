import {queryOptions, useMutation} from '@tanstack/vue-query'
import isEqual from 'fast-deep-equal'

import {
	userCancelEmailUpdate,
	userChangePassword,
	userResendEmailConfirmation,
	userTimezones,
	userUpdateEmail,
	userUpdateSettings,
} from '@/client/generated'
import type {UserGeneralSettingsWritable} from '@/client/generated'
import {translate} from '@/i18n'
import type {FrontendSettings, UserSettings} from '@/modules/settings/userSettings'

import {contextMutationOptions} from './contextMutation'

export const userKeys = {
	timezones: ['user', 'timezones'] as const,
}

/** Every time zone the server can handle, sorted. It depends on the host, so it is fetched once. */
export function timezonesQuery() {
	return queryOptions({
		queryKey: userKeys.timezones,
		queryFn: async ({signal}) => [...(await userTimezones({signal})).data ?? []].sort((a, b) => a.localeCompare(b)),
		staleTime: Infinity,
	})
}

// General settings

type WritableSettings = Omit<UserSettings, 'frontend_settings' | 'extra_settings_links'>

/** Some of the general settings; frontend settings are merged key by key. */
export type UserSettingsPatch = Partial<WritableSettings> & {
	frontend_settings?: Partial<FrontendSettings>
}

export function applySettingsPatch(settings: UserSettings, {frontend_settings, ...patch}: UserSettingsPatch): UserSettings {
	return {
		...settings,
		...patch,
		frontend_settings: {...settings.frontend_settings, ...frontend_settings},
	}
}

function restoreKeys<T extends object>(current: T, changed: Partial<T>, previous: T): T {
	const restored = {...current}
	for (const key of Object.keys(changed) as (keyof T)[]) {
		if (isEqual(current[key], changed[key])) {
			restored[key] = previous[key]
		}
	}
	return restored
}

/**
 * Undoes a failed patch: each key it set goes back to its previous value, unless a
 * later change has replaced it in the meantime.
 */
export function revertSettingsPatch(current: UserSettings, {frontend_settings = {}, ...patch}: UserSettingsPatch, previous: UserSettings): UserSettings {
	return {
		...restoreKeys<UserSettings>(current, patch, previous),
		frontend_settings: restoreKeys(current.frontend_settings, frontend_settings, previous.frontend_settings),
	}
}

/**
 * The PUT body: the API replaces every setting, so all of them go, frontend settings
 * included (unknown keys too). Demo servers reset users, so they get no language.
 */
export function userSettingsBody(settings: UserSettings, demoMode: boolean): UserGeneralSettingsWritable {
	const {extra_settings_links: _links, ...writable} = settings
	return {...writable, language: demoMode ? undefined : writable.language}
}

export async function updateUserSettings(settings: UserSettings, demoMode: boolean): Promise<void> {
	await userUpdateSettings({body: userSettingsBody(settings, demoMode)})
}

// Email and password

export interface EmailUpdateInput {
	new_email: string
	password: string
}

export function updateEmailMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({new_email, password}: EmailUpdateInput) => {
			await userUpdateEmail({body: {new_email: new_email.trim(), password}})
		},
		// The form shows what went wrong next to the field.
		toastError: () => false,
		// Input holds the password.
		gcTime: 0,
	})
}

export function resendEmailConfirmationMutationOptions() {
	return contextMutationOptions<void, void>({
		mutationFn: async () => {
			await userResendEmailConfirmation()
		},
		successMessage: () => translate('settingsAccount.email.resent'),
	})
}

export function cancelEmailUpdateMutationOptions() {
	return contextMutationOptions<void, void>({
		mutationFn: async () => {
			await userCancelEmailUpdate()
		},
		successMessage: () => translate('settingsAccount.email.cancelled'),
	})
}

export interface PasswordChangeInput {
	old_password: string
	new_password: string
}

export function changePasswordMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({old_password, new_password}: PasswordChangeInput) => {
			await userChangePassword({body: {old_password, new_password}})
		},
		toastError: () => false,
		// Input holds both passwords.
		gcTime: 0,
	})
}

export const useUpdateEmailMutation = () => useMutation(updateEmailMutationOptions())
export const useResendEmailConfirmationMutation = () => useMutation(resendEmailConfirmationMutationOptions())
export const useCancelEmailUpdateMutation = () => useMutation(cancelEmailUpdateMutationOptions())
export const useChangePasswordMutation = () => useMutation(changePasswordMutationOptions())
