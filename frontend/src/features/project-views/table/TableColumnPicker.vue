<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {Columns3} from '@lucide/vue'

import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'

import {TABLE_COLUMNS, type TableColumnKey} from './columns'

/** Which columns the table shows; remembered on this device. */
const visible = defineModel<TableColumnKey[]>({required: true})

const {t} = useI18n()

function toggle(key: TableColumnKey, shown: boolean | 'indeterminate') {
	visible.value = shown === true
		? TABLE_COLUMNS.filter(column => column.key === key || visible.value.includes(column.key)).map(column => column.key)
		: visible.value.filter(candidate => candidate !== key)
}
</script>

<template>
	<UiAdaptivePopover
		:title="t('projectView.table.columns')"
		align="end"
		class="w-60"
	>
		<template #trigger>
			<UiButton
				variant="ghost"
				size="sm"
				:icon="Columns3"
				class="shrink-0 text-ink-muted"
			>
				<span class="hidden @md:inline">{{ t('projectView.table.columns') }}</span>
			</UiButton>
		</template>
		<div class="grid gap-0.5 p-2">
			<UiCheckbox
				v-for="column in TABLE_COLUMNS"
				:key="column.key"
				:model-value="visible.includes(column.key)"
				:disabled="column.required"
				class="rounded-sm px-2 py-1.5 hover:bg-canvas-subtle pointer-coarse:py-2.5"
				@update:modelValue="shown => toggle(column.key, shown)"
			>
				{{ t(`projectView.table.column.${column.key}`) }}
			</UiCheckbox>
		</div>
	</UiAdaptivePopover>
</template>
