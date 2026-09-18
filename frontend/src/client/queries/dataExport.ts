import {queryOptions, useMutation, useQuery} from '@tanstack/vue-query'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'

import {userExportDownload, userExportRequest, userExportStatus} from '@/client/generated'
import type {UserExportStatus} from '@/client/generated'
import {downloadBlob} from '@/helpers/downloadBlob'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'

export const dataExportKeys = {
	current: ['data-export'] as const,
}

/** The export ready to download. There is at most one: a new one replaces it. */
export interface DataExport {
	id: number
	size: number
	created: Date
	expires: Date
}

export function toDataExport(status: UserExportStatus | null | undefined): DataExport | null {
	const created = parseDateOrNull(status?.created)
	const expires = parseDateOrNull(status?.expires)
	if (!status?.id || !created || !expires) {
		return null
	}
	return {id: status.id, size: status.size ?? 0, created, expires}
}

export const DATA_EXPORT_POLL_INTERVAL = 4000
// The email still arrives if the export takes longer than the page waits.
export const DATA_EXPORT_POLL_DEADLINE = 10 * 60 * 1000

/** An export asked for in this visit, told apart from the one that was there by its id. */
export interface DataExportRequest {
	previousId: number | null
	at: number
}

export function isDataExportPending(current: DataExport | null | undefined, request: DataExportRequest | null): boolean {
	return request !== null && (current?.id ?? null) === request.previousId
}

export function dataExportQuery() {
	return queryOptions({
		queryKey: dataExportKeys.current,
		queryFn: async ({signal}) => toDataExport((await userExportStatus({signal})).data),
		staleTime: 0,
	})
}

/** The current export; asked again every few seconds while a requested one is being put together. */
export function useDataExport(request: MaybeRefOrGetter<DataExportRequest | null> = null) {
	return useQuery(computed(() => {
		// Read here, not in the callback: a new request must reach the observer as new options.
		const pending = toValue(request)
		return {
			...dataExportQuery(),
			refetchInterval: (query: {state: {data?: DataExport | null}}) =>
				isDataExportPending(query.state.data, pending) && Date.now() - (pending?.at ?? 0) < DATA_EXPORT_POLL_DEADLINE
					? DATA_EXPORT_POLL_INTERVAL
					: false,
		}
	}))
}

export function dataExportFileName(dataExport: Pick<DataExport, 'created'>): string {
	const created = dataExport.created
	const day = [created.getFullYear(), created.getMonth() + 1, created.getDate()]
		.map(part => String(part).padStart(2, '0'))
		.join('-')
	return `norna-export-${day}.zip`
}

export function requestDataExportMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (password: string) => {
				await userExportRequest({body: {password}})
			},
			successMessage: () => translate('settingsData.export.requested'),
			// A wrong password is shown at the field, anything else by the page.
			toastError: () => false,
		}),
		// Input is the password.
		gcTime: 0,
	}
}

export interface DownloadDataExportInput {
	password: string
	fileName: string
}

export function downloadDataExportMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async ({password, fileName}: DownloadDataExportInput) => {
				const {data} = await userExportDownload({body: {password}, parseAs: 'blob'})
				// Firefox hands back null instead of an empty blob when the response has no body.
				if (!(data instanceof Blob)) {
					throw new Error('Did not get the export file')
				}
				downloadBlob(window.URL.createObjectURL(data), fileName)
			},
			toastError: () => false,
		}),
		gcTime: 0,
	}
}

export const useRequestDataExportMutation = () => useMutation(requestDataExportMutationOptions())
export const useDownloadDataExportMutation = () => useMutation(downloadDataExportMutationOptions())
