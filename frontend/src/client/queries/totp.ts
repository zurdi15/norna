import {queryOptions, useMutation} from '@tanstack/vue-query'

import {totpDisable, totpEnable, totpEnroll, totpGet, totpQrcode} from '@/client/generated'
import type {Totp} from '@/client/generated'
import {problemCode} from '@/modules/api/problem'

import {contextMutationOptions} from './contextMutation'

const TOTP_NOT_ENABLED = 1016

/**
 * off: never set up. pending: enrolled but not confirmed with a passcode yet, so the
 * secret is still shown for setting up the app. on: every sign-in asks for a passcode.
 */
export type TotpStatus =
	| {state: 'off'}
	| {state: 'pending', secret: string, url: string}
	| {state: 'on'}

export const totpKeys = {
	status: ['totp', 'status'] as const,
	qrCode: ['totp', 'qr-code'] as const,
}

export function toTotpStatus(totp: Totp): TotpStatus {
	if (totp.enabled) {
		return {state: 'on'}
	}
	return totp.secret ? {state: 'pending', secret: totp.secret, url: totp.url ?? ''} : {state: 'off'}
}

// Both hold the secret while a setup is pending: dropped from the cache as soon as the page closes.
export function totpStatusQuery() {
	return queryOptions({
		queryKey: totpKeys.status,
		queryFn: async ({signal}): Promise<TotpStatus> => {
			try {
				return toTotpStatus((await totpGet({signal})).data)
			} catch (e) {
				if (problemCode(e) === TOTP_NOT_ENABLED) {
					return {state: 'off'}
				}
				throw e
			}
		},
		gcTime: 0,
	})
}

export function totpQrCodeQuery() {
	return queryOptions({
		queryKey: totpKeys.qrCode,
		queryFn: async ({signal}) => (await totpQrcode({signal, parseAs: 'blob'})).data as Blob,
		gcTime: 0,
		staleTime: Infinity,
	})
}

export function enrollTotpMutationOptions() {
	return {
		...contextMutationOptions<TotpStatus, void>({
			mutationFn: async () => toTotpStatus((await totpEnroll()).data),
			onSuccess: (status, _input, client) => {
				client.setQueryData(totpKeys.status, status)
				client.removeQueries({queryKey: totpKeys.qrCode})
			},
		}),
		// The result holds the new secret.
		gcTime: 0,
	}
}

/** Confirms the setup. The server then signs out every session, this one included. */
export function enableTotpMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (passcode: string) => {
				await totpEnable({body: {passcode: passcode.replace(/\s/g, '')}})
			},
			onSuccess: (_data, _passcode, client) => {
				client.setQueryData<TotpStatus>(totpKeys.status, {state: 'on'})
				client.removeQueries({queryKey: totpKeys.qrCode})
			},
			// The form shows a wrong code next to the field.
			toastError: () => false,
		}),
		gcTime: 0,
	}
}

export function disableTotpMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (password: string) => {
				await totpDisable({body: {password}})
			},
			onSuccess: (_data, _password, client) => client.setQueryData<TotpStatus>(totpKeys.status, {state: 'off'}),
			toastError: () => false,
		}),
		// Input holds the password.
		gcTime: 0,
	}
}

export const useEnrollTotpMutation = () => useMutation(enrollTotpMutationOptions())
export const useEnableTotpMutation = () => useMutation(enableTotpMutationOptions())
export const useDisableTotpMutation = () => useMutation(disableTotpMutationOptions())
