<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'

import {timezonesQuery} from '@/client/queries/user'
import UiListbox from '@/ui/UiListbox.vue'

import PickerField from './PickerField.vue'
import {timezoneLabel, timezoneOptions} from './timezones'

/** The user's time zone, searched among the ones the server knows, with their offset today. */
defineProps<{
	id?: string
	describedBy?: string
}>()

const emit = defineEmits<{
	select: [timezone: string]
}>()

const timezone = defineModel<string>({default: ''})

const {t} = useI18n()
const query = useQuery(timezonesQuery())
// Lazy: only built once the list opens.
const options = computed(() => timezoneOptions(query.data.value ?? [], new Date()))

function pick(id: string, close: () => void) {
	close()
	if (id !== timezone.value) {
		timezone.value = id
		emit('select', id)
	}
}
</script>

<template>
	<PickerField
		:id="id"
		:described-by="describedBy"
		:title="t('settingsAccount.general.timezone')"
		:text="timezone ? timezoneLabel(timezone) : undefined"
		:placeholder="t('settingsAccount.general.chooseTimezone')"
	>
		<template #default="{close}">
			<UiListbox
				:model-value="timezone"
				:items="options"
				:item-key="option => option.id"
				:item-label="option => option.label"
				:label="t('settingsAccount.general.timezone')"
				:search-placeholder="t('settingsAccount.general.searchTimezone')"
				:loading="query.isPending.value"
				@select="id => pick(id, close)"
			>
				<template #item="{item}">
					<span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
					<span class="shrink-0 font-mono text-2xs text-ink-faint tabular-nums">{{ item.offset }}</span>
				</template>
			</UiListbox>
		</template>
	</PickerField>
</template>
