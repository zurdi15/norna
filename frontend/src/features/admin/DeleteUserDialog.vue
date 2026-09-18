<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Mail, Trash2} from '@lucide/vue'

import {useDeleteAdminUserMutation, type AdminUserWithId, type DeleteUserMode} from '@/client/queries/admin'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'

/**
 * Deletes an account one of two ways: right away with all its data, or by email, where
 * the user confirms it as if they had asked themselves.
 */
const props = defineProps<{
	user: AdminUserWithId | null
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const remove = useDeleteAdminUserMutation()
const pending = ref<DeleteUserMode | null>(null)

async function deleteUser(mode: DeleteUserMode) {
	if (!props.user || pending.value) {
		return
	}
	pending.value = mode
	try {
		await remove.mutateAsync({id: props.user.id, username: props.user.username ?? '', mode})
		open.value = false
	} catch {
		// Reported by the mutation.
	} finally {
		pending.value = null
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('admin.users.deleteTitle', {username: user?.username ?? ''})"
	>
		<div class="grid gap-3 text-sm text-pretty text-ink-muted">
			<p>{{ t('admin.users.deleteNowHelp') }}</p>
			<p>{{ t('admin.users.deleteScheduledHelp') }}</p>
		</div>
		<template #footer="{close}">
			<UiButton
				variant="ghost"
				class="me-auto"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				:icon="Mail"
				:loading="pending === 'scheduled'"
				:disabled="pending === 'now'"
				@click="deleteUser('scheduled')"
			>
				{{ t('admin.users.deleteScheduled') }}
			</UiButton>
			<UiButton
				variant="danger"
				:icon="Trash2"
				:loading="pending === 'now'"
				:disabled="pending === 'scheduled'"
				@click="deleteUser('now')"
			>
				{{ t('admin.users.deleteNow') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
