<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import GeneralAppearanceSection from '@/features/settings/account/general/GeneralAppearanceSection.vue'
import GeneralNotificationsSection from '@/features/settings/account/general/GeneralNotificationsSection.vue'
import GeneralPrivacySection from '@/features/settings/account/general/GeneralPrivacySection.vue'
import GeneralProfileSection from '@/features/settings/account/general/GeneralProfileSection.vue'
import GeneralRegionSection from '@/features/settings/account/general/GeneralRegionSection.vue'
import GeneralTasksSection from '@/features/settings/account/general/GeneralTasksSection.vue'
import ShortcutRecorder from '@/features/settings/account/ShortcutRecorder.vue'
import {useAccountSettings} from '@/features/settings/account/useAccountSettings'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {isDesktopApp} from '@/helpers/desktopAuth'
import {useConfigStore} from '@/stores/config'

/** Profile, language, appearance and task defaults. Every change saves on its own. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const {frontend, saveFrontend} = useAccountSettings()
const desktop = isDesktopApp()
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.general')"
		:description="t('settingsAccount.general.description')"
	>
		<GeneralProfileSection />
		<GeneralRegionSection />
		<GeneralAppearanceSection />
		<GeneralTasksSection />
		<!-- The daily summary is an email too: both depend on the server sending them. -->
		<GeneralNotificationsSection v-if="configStore.email_reminders_enabled" />
		<GeneralPrivacySection />
		<SettingsSection
			v-if="desktop"
			:title="t('settingsAccount.general.sections.desktop')"
		>
			<SettingsRow
				v-slot="{id, describedBy}"
				:label="t('settingsAccount.general.quickEntryShortcut')"
				:description="t('settingsAccount.general.quickEntryShortcutDescription')"
				stack
			>
				<ShortcutRecorder
					:id="id"
					:described-by="describedBy"
					:model-value="frontend.desktop_quick_entry_shortcut"
					@change="shortcut => saveFrontend({desktop_quick_entry_shortcut: shortcut})"
				/>
			</SettingsRow>
		</SettingsSection>
	</SettingsPage>
</template>
