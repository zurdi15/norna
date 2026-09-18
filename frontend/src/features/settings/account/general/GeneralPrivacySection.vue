<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import {useAccountSettings} from '../useAccountSettings'

/** Whether others can find this account when they share projects or add people. */
const {t} = useI18n()
const {settings, save} = useAccountSettings()
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.privacy')">
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.discoverableByName')"
			:description="t('settingsAccount.general.discoverableByNameDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="settings.discoverable_by_name"
				@update:modelValue="enabled => save({discoverable_by_name: enabled})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.discoverableByEmail')"
			:description="t('settingsAccount.general.discoverableByEmailDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="settings.discoverable_by_email"
				@update:modelValue="enabled => save({discoverable_by_email: enabled})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
