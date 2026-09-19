<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {ListStart, Monitor, Moon, Sun} from '@lucide/vue'

import {DEFAULT_PROJECT_VIEW_SETTINGS, type DefaultProjectViewKind} from '@/constants/projectView'
import {PRIORITIES} from '@/constants/priorities'
import {VIEW_ICONS} from '@/features/project-views/viewKinds'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {priorityLabelKey} from '@/features/tasks/priority'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import {useAccountSettings} from '../useAccountSettings'

/** Theme and what lists and projects show. The theme is the one in the user menu too. */
const {t} = useI18n()
const {frontend, saveFrontend} = useAccountSettings()

const themeItems = computed(() => [
	{value: 'auto' as const, label: t('settingsAccount.general.themeSystem'), icon: Monitor},
	{value: 'light' as const, label: t('shell.user.themeLight'), icon: Sun},
	{value: 'dark' as const, label: t('shell.user.themeDark'), icon: Moon},
])

const viewItems = computed(() => (Object.values(DEFAULT_PROJECT_VIEW_SETTINGS) as DefaultProjectViewKind[]).map(value => value === 'first'
	? {value, label: t('settingsAccount.general.firstView'), icon: ListStart}
	: {value, label: t(`projectView.kinds.${value}`), icon: VIEW_ICONS[value]}))

// Unset priorities never show, so the lowest threshold is "low".
const priorityItems = computed(() => [PRIORITIES.LOW, PRIORITIES.MEDIUM, PRIORITIES.HIGH, PRIORITIES.URGENT, PRIORITIES.DO_NOW]
	.map(value => ({value, label: t(priorityLabelKey(value))})))

const commentOrderItems = computed(() => [
	{value: 'asc' as const, label: t('settingsAccount.general.commentsOldest')},
	{value: 'desc' as const, label: t('settingsAccount.general.commentsNewest')},
])
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.appearance')">
		<SettingsRow
			:label="t('shell.user.theme')"
			stack
		>
			<UiSegmented
				:items="themeItems"
				:label="t('shell.user.theme')"
				:model-value="frontend.color_schema"
				@update:modelValue="scheme => saveFrontend({color_schema: scheme})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.defaultView')"
			:description="t('settingsAccount.general.defaultViewDescription')"
			stack
		>
			<UiSelect
				:items="viewItems"
				:model-value="frontend.default_view"
				@update:modelValue="view => view && saveFrontend({default_view: view})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.minimumPriority')"
			:description="t('settingsAccount.general.minimumPriorityDescription')"
			stack
		>
			<UiSelect
				:items="priorityItems"
				:model-value="frontend.minimum_priority"
				@update:modelValue="priority => priority !== undefined && saveFrontend({minimum_priority: priority})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.commentOrder')"
			stack
		>
			<UiSegmented
				:items="commentOrderItems"
				:label="t('settingsAccount.general.commentOrder')"
				:model-value="frontend.comment_sort_order"
				@update:modelValue="order => saveFrontend({comment_sort_order: order})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.showLastViewed')"
			:description="t('settingsAccount.general.showLastViewedDescription')"
		>
			<UiSwitch
				:id="id"
				:aria-describedby="describedBy"
				:model-value="frontend.show_last_viewed"
				@update:modelValue="show => saveFrontend({show_last_viewed: show})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
