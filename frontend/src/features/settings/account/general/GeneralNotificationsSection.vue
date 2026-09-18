<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import TimeInput from '../TimeInput.vue'
import {useAccountSettings} from '../useAccountSettings'

/** The emails Norna sends: task reminders and the daily summary of overdue tasks. */
const {t} = useI18n()
const {settings, save} = useAccountSettings()
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.notifications')">
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.emailReminders')"
			:description="t('settingsAccount.general.emailRemindersDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="settings.email_reminders_enabled"
				@update:modelValue="enabled => save({email_reminders_enabled: enabled})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.overdueReminders')"
			:description="t('settingsAccount.general.overdueRemindersDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="settings.overdue_tasks_reminders_enabled"
				@update:modelValue="enabled => save({overdue_tasks_reminders_enabled: enabled})"
			/>
		</SettingsRow>
		<SettingsRow
			v-if="settings.overdue_tasks_reminders_enabled"
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.overdueTime')"
		>
			<TimeInput
				:id="id"
				:aria-describedby="describedBy"
				:value="settings.overdue_tasks_reminders_time"
				required
				class="w-32 font-mono tabular-nums"
				@commit="time => save({overdue_tasks_reminders_time: time})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
