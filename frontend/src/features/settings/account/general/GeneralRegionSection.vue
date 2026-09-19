<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {DATE_DISPLAY, type DateDisplay} from '@/constants/dateDisplay'
import {TIME_FORMAT} from '@/constants/timeFormat'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import {formatDateSince, formatDisplayDateFormat} from '@/helpers/time/formatDate'
import {SUPPORTED_LOCALES} from '@/i18n'
import type {UserSettings} from '@/modules/settings/userSettings'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSelect from '@/ui/UiSelect.vue'

import TimezonePicker from '../TimezonePicker.vue'
import {useAccountSettings} from '../useAccountSettings'

/** Language, time zone and how dates and times are written. */
const {t, locale} = useI18n()
const {settings, frontend, save, saveFrontend} = useAccountSettings()

const languageItems = Object.entries(SUPPORTED_LOCALES).map(([value, label]) => ({value, label}))

// Names from Intl, so they follow the language; 2023-01-01 was a Sunday.
const weekStartItems = computed(() => {
	const weekday = new Intl.DateTimeFormat(locale.value, {weekday: 'long'})
	return ([0, 1, 2, 3, 4, 5, 6] as const).map(value => {
		const name = weekday.format(new Date(2023, 0, 1 + value))
		return {value, label: name.charAt(0).toLocaleUpperCase(locale.value) + name.slice(1)}
	})
})

// The clock choices show a time written each way.
const clockItems = computed(() => [TIME_FORMAT.HOURS_24, TIME_FORMAT.HOURS_12].map(value => ({
	value,
	label: new Intl.DateTimeFormat(locale.value, {hour: 'numeric', minute: '2-digit', hour12: value === TIME_FORMAT.HOURS_12})
		.format(new Date(2023, 0, 1, 16, 30)),
})))

const dateItems = computed(() => {
	const sample = new Date()
	return (Object.values(DATE_DISPLAY) as DateDisplay[]).map(value => ({
		value,
		label: value === DATE_DISPLAY.RELATIVE
			? t('settingsAccount.general.dateRelative', {example: formatDateSince(new Date(sample.getTime() - 3 * 24 * 60 * 60 * 1000))})
			: formatDisplayDateFormat(sample, value, frontend.value.time_format),
	}))
})
</script>

<template>
	<SettingsSection :title="t('settingsAccount.general.sections.region')">
		<SettingsRow
			:label="t('settingsAccount.general.language')"
			stack
		>
			<UiSelect
				:items="languageItems"
				:model-value="settings.language"
				@update:modelValue="language => language && save({language})"
			/>
		</SettingsRow>
		<SettingsRow
			v-slot="{id, describedBy}"
			:label="t('settingsAccount.general.timezone')"
			:description="t('settingsAccount.general.timezoneDescription')"
			stack
		>
			<TimezonePicker
				:id="id"
				:described-by="describedBy"
				:model-value="settings.timezone"
				@select="timezone => save({timezone})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.weekStart')"
			stack
		>
			<UiSelect
				:items="weekStartItems"
				:model-value="settings.week_start"
				@update:modelValue="day => day !== undefined && save({week_start: day as UserSettings['week_start']})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.timeFormat')"
		>
			<UiSegmented
				:items="clockItems"
				:label="t('settingsAccount.general.timeFormat')"
				:model-value="frontend.time_format"
				@update:modelValue="format => saveFrontend({time_format: format})"
			/>
		</SettingsRow>
		<SettingsRow
			:label="t('settingsAccount.general.dateDisplay')"
			:description="t('settingsAccount.general.dateDisplayDescription')"
			stack
		>
			<UiSelect
				:items="dateItems"
				:model-value="frontend.date_display"
				@update:modelValue="format => format && saveFrontend({date_display: format})"
			/>
		</SettingsRow>
	</SettingsSection>
</template>
