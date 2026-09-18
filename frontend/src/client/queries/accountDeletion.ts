import {useMutation} from '@tanstack/vue-query'

import {userDeletionCancel, userDeletionRequest} from '@/client/generated'
import {translate} from '@/i18n'

import {contextMutationOptions} from './contextMutation'

// Nothing here is cached: the scheduled date comes with the current user (auth store).

export function requestAccountDeletionMutationOptions() {
	return {
		...contextMutationOptions({
			// Only sends the confirmation email; nothing is scheduled until its link is opened.
			mutationFn: async (password: string) => {
				await userDeletionRequest({body: {password}})
			},
			// The page says where to look next; a wrong password is shown at the field.
			toastError: () => false,
		}),
		// Input is the password.
		gcTime: 0,
	}
}

export function cancelAccountDeletionMutationOptions() {
	return {
		...contextMutationOptions({
			mutationFn: async (password: string) => {
				await userDeletionCancel({body: {password}})
			},
			successMessage: () => translate('settingsData.deletion.cancelled'),
			toastError: () => false,
		}),
		gcTime: 0,
	}
}

export const useRequestAccountDeletionMutation = () => useMutation(requestAccountDeletionMutationOptions())
export const useCancelAccountDeletionMutation = () => useMutation(cancelAccountDeletionMutationOptions())
