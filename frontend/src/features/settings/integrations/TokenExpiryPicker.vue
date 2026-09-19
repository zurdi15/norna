<script setup lang="ts">
import {computed, ref, useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {CalendarDays} from '@lucide/vue'

import {addDays} from '@/helpers/time/dateMath'
import {useAuthStore} from '@/stores/auth'
import {cn} from '@/ui/cn'
import {fieldBoxVariants} from '@/ui/field'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSegmented from '@/ui/UiSegmented.vue'

import {formatDay, NEVER_EXPIRES} from './format'

/** When a new token stops working: a month, three, a year, never, or a day picked on the calendar. */
const props = withDefaults(defineProps<{
	invalid?: boolean
	describedBy?: string
}>(), {
	invalid: false,
	describedBy: undefined,
})

const model = defineModel<Date>({required: true})

type Choice = '30' | '90' | '365' | 'never' | 'custom'

const {t, locale} = useI18n()
const authStore = useAuthStore()
const calendarId = useId()

const choice = ref<Choice>('30')
const calendarOpen = ref(false)

const choices = computed(() => [
	{value: '30' as const, label: t('settingsIntegrations.tokens.expiry.days', {count: 30})},
	{value: '90' as const, label: t('settingsIntegrations.tokens.expiry.days', {count: 90})},
	{value: '365' as const, label: t('settingsIntegrations.tokens.expiry.year')},
	{value: 'never' as const, label: t('settingsIntegrations.tokens.expiry.never')},
	{value: 'custom' as const, label: t('settingsIntegrations.tokens.expiry.custom')},
])

const selected = computed({
	get: () => choice.value,
	set: (value: Choice) => {
		choice.value = value
		// A custom date starts from the one already chosen, or from a year after "never".
		if (value === 'never') {
			model.value = NEVER_EXPIRES
		} else if (value !== 'custom') {
			model.value = addDays(new Date(), Number(value))
		} else if (model.value.getTime() === NEVER_EXPIRES.getTime()) {
			model.value = addDays(new Date(), 365)
		}
	},
})

// The earliest day that can be picked is tomorrow.
const tomorrow = computed(() => addDays(new Date(), 1))

const calendarDay = computed({
	get: () => model.value,
	set: (value: Date | null) => {
		if (value) {
			model.value = value
			calendarOpen.value = false
		}
	},
})
</script>

<template>
	<div class="grid gap-2">
		<UiSegmented
			v-model="selected"
			:items="choices"
			:label="t('settingsIntegrations.tokens.expiry.label')"
			class="flex w-full *:flex-1 sm:w-auto sm:justify-self-start"
		/>
		<UiAdaptivePopover
			v-if="choice === 'custom'"
			v-model:open="calendarOpen"
			:title="t('settingsIntegrations.tokens.expiry.pick')"
			class="w-72"
		>
			<template #trigger>
				<button
					:id="calendarId"
					type="button"
					:aria-describedby="props.describedBy"
					:aria-invalid="invalid ? 'true' : undefined"
					:class="cn(fieldBoxVariants({invalid}), 'cursor-pointer text-start focus-visible:outline-none sm:w-60')"
				>
					<UiIcon
						:icon="CalendarDays"
						class="text-ink-faint"
					/>
					<span class="min-w-0 flex-1 truncate font-mono">{{ formatDay(model, locale) }}</span>
				</button>
			</template>
			<div class="p-3 pointer-coarse:px-4">
				<UiCalendar
					v-model="calendarDay"
					:week-starts-on="authStore.settings.week_start"
					:min-value="tomorrow"
				/>
			</div>
		</UiAdaptivePopover>
	</div>
</template>
