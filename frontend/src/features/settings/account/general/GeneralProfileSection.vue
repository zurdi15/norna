<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {useAuthStore} from '@/stores/auth'

import CommitInput from '../CommitInput.vue'
import DefaultProjectPicker from '../DefaultProjectPicker.vue'
import {useAccountSettings} from '../useAccountSettings'
import {useLocalAccount} from '../useLocalAccount'

/** Name and default project. */
const {t} = useI18n()
const authStore = useAuthStore()
const {settings, save} = useAccountSettings()
// LDAP and OpenID accounts get their name from the provider on every sign-in.
const {isLocal, provider} = useLocalAccount()
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.profile')">
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.name')"
			:description="isLocal
				? t('settingsAccount.general.nameDescription')
				: t('settingsAccount.general.nameExternal', {provider})"
			stack
		>
			<CommitInput
				:id="id"
				:aria-describedby="describedBy"
				:value="settings.name"
				:placeholder="authStore.info?.username"
				:disabled="!isLocal"
				autocomplete="name"
				@commit="name => save({name})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.defaultProject')"
			:description="t('settingsAccount.general.defaultProjectDescription')"
			stack
		>
			<DefaultProjectPicker
				:id="id"
				:described-by="describedBy"
				:model-value="settings.default_project_id"
				@select="projectId => save({default_project_id: projectId})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
