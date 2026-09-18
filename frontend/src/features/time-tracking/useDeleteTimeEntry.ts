import {useI18n} from 'vue-i18n'

import type {TimeEntry} from '@/client/generated'
import {useDeleteTimeEntryMutation} from '@/client/queries/timeEntries'
import {confirm} from '@/ui/confirm'

/** Deletes an entry once the user confirms it. */
export function useDeleteTimeEntry() {
	const {t} = useI18n()
	const remove = useDeleteTimeEntryMutation()

	return async (entry: TimeEntry) => {
		if (entry.id === undefined) {
			return
		}
		const confirmed = await confirm({
			title: t('timeTracking.deleteTitle'),
			description: t('timeTracking.deleteDescription'),
			confirmLabel: t('timeTracking.delete'),
			tone: 'danger',
		})
		if (confirmed) {
			remove.mutate({id: entry.id, taskId: entry.task_id || undefined})
		}
	}
}
