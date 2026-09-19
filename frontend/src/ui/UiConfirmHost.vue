<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {pendingConfirm, settleConfirm} from './confirm'
import UiButton from './UiButton.vue'
import UiDialog from './UiDialog.vue'

const {t} = useI18n()

const open = computed({
	get: () => pendingConfirm.value !== null,
	set: isOpen => {
		if (!isOpen) {
			settleConfirm(false)
		}
	},
})
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="pendingConfirm?.title ?? ''"
		:description="pendingConfirm?.description"
		size="sm"
	>
		<template #footer>
			<UiButton
				variant="ghost"
				@click="settleConfirm(false)"
			>
				{{ pendingConfirm?.cancelLabel ?? t('ui.cancel') }}
			</UiButton>
			<UiButton
				:variant="pendingConfirm?.tone === 'danger' ? 'danger' : 'primary'"
				data-autofocus
				@click="settleConfirm(true)"
			>
				{{ pendingConfirm?.confirmLabel }}
			</UiButton>
		</template>
	</UiDialog>
</template>
