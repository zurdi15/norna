<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {RELATION_KINDS} from '@/features/tasks/detail/relationKinds'
import {PREFIXES, PrefixMode} from '@/modules/quickAddMagic/prefixes'
import type {IRelationKind} from '@/types/IRelationKind'
import UiSelect from '@/ui/UiSelect.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import QuickAddRemindersField from '../QuickAddRemindersField.vue'
import FeaturedLabelsField from '../FeaturedLabelsField.vue'
import TimeInput from '../TimeInput.vue'
import {useAccountSettings} from '../useAccountSettings'

/** How quick add reads what you type, and a few defaults for new tasks. */
const {t} = useI18n()
const {frontend, saveFrontend} = useAccountSettings()

const magicItems = computed(() => [
	{value: PrefixMode.Default, label: t('settingsAccount.general.magicModes.norna')},
	{value: PrefixMode.Todoist, label: t('settingsAccount.general.magicModes.todoist')},
	{value: PrefixMode.Disabled, label: t('settingsAccount.general.magicModes.disabled')},
])

// The prefixes of the picked mode, as the quick add box itself lists them.
const magicDescription = computed(() => {
	const prefixes = PREFIXES[frontend.value.quick_add_magic_mode]
	return prefixes ? t('quickAdd.hint', {...prefixes}) : t('settingsAccount.general.magicOff')
})

const relationItems = computed(() => RELATION_KINDS.map(value => ({value, label: t(`taskDetail.relations.kinds.${value}`)})))
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.tasks')">
		<SettingsRow
			:label="t('settingsAccount.general.magic')"
			:description="magicDescription"
			stack
		>
			<UiSelect
				:items="magicItems"
				:model-value="frontend.quick_add_magic_mode"
				@update:modelValue="mode => mode && saveFrontend({quick_add_magic_mode: mode})"
			/>
		</SettingsRow>
		<SettingsRow
			v-if="frontend.quick_add_magic_mode !== PrefixMode.Disabled"
			:label="t('settingsAccount.general.defaultReminders')"
			:description="t('settingsAccount.general.defaultRemindersDescription')"
			stack
		>
			<QuickAddRemindersField
				:label="t('settingsAccount.general.defaultReminders')"
				:model-value="frontend.quick_add_default_reminders"
				@update:modelValue="reminders => saveFrontend({quick_add_default_reminders: [...reminders]})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.featuredLabels')"
			:description="t('settingsAccount.general.featuredLabelsDescription')"
			stack
		>
			<FeaturedLabelsField
				:label="t('settingsAccount.general.featuredLabels')"
				:model-value="frontend.featured_label_ids"
				@update:modelValue="ids => saveFrontend({featured_label_ids: [...ids]})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.defaultDueTime')"
			:description="t('settingsAccount.general.defaultDueTimeDescription')"
		>
			<TimeInput
				:id="id"
				:aria-describedby="describedBy"
				:value="frontend.default_due_time ?? ''"
				class="w-32 font-mono tabular-nums"
				@commit="time => saveFrontend({default_due_time: time})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.relationKind')"
			:description="t('settingsAccount.general.relationKindDescription')"
			stack
		>
			<UiSelect
				:items="relationItems"
				:model-value="frontend.default_task_relation_type"
				@update:modelValue="kind => kind && saveFrontend({default_task_relation_type: kind as IRelationKind})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.playSound')"
			:description="t('settingsAccount.general.playSoundDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="frontend.play_sound_when_done"
				@update:modelValue="play => saveFrontend({play_sound_when_done: play})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
