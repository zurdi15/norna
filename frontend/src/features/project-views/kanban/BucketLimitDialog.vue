<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {useSetBucketLimitMutation, type BoardBucket} from '@/client/queries/taskBoard'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

import {parseLimit} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** How many cards a column takes; 0 or empty removes the limit. */
const props = defineProps<{
	bucket: BoardBucket
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const board = useKanbanBoard()
const setLimit = useSetBucketLimitMutation()

const formId = useId()
const draft = ref('')
const touched = ref(false)

watch(open, isOpen => {
	if (isOpen) {
		draft.value = props.bucket.limit ? String(props.bucket.limit) : ''
		touched.value = false
	}
})

const limit = computed(() => parseLimit(draft.value))
const error = computed(() => touched.value && limit.value === null ? t('kanban.limitInvalid') : undefined)

function save() {
	touched.value = true
	const value = limit.value
	if (value === null) {
		return
	}
	if (value !== (props.bucket.limit ?? 0)) {
		setLimit.mutate({
			projectId: board.projectId.value,
			viewId: board.viewId.value,
			bucket: {
				id: props.bucket.id,
				title: props.bucket.title ?? '',
				limit: value,
				position: props.bucket.position ?? 0,
			},
		})
	}
	open.value = false
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('kanban.limitTitle', {title: bucket.title})"
		size="sm"
	>
		<form
			:id="formId"
			class="grid gap-3"
			@submit.prevent="save"
		>
			<UiField
				:label="t('kanban.limitLabel')"
				:hint="t('kanban.limitHint')"
				:error="error"
			>
				<UiInput
					v-model="draft"
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					autocomplete="off"
					data-autofocus
					:placeholder="t('kanban.noLimit')"
					@blur="touched = true"
				/>
			</UiField>
		</form>
		<template #footer="{close}">
			<UiButton @click="close">
				{{ t('misc.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				type="submit"
				:form="formId"
			>
				{{ t('misc.save') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
