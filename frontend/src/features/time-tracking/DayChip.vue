<script setup lang="ts">
import {ref} from 'vue'
import {CalendarDays} from '@lucide/vue'

import {useAuthStore} from '@/stores/auth'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiChip from '@/ui/UiChip.vue'

/** One end of a custom range: a chip that opens a calendar. */
defineProps<{
	// Names the calendar ("From", "To").
	title: string
	// What the chip shows, e.g. "From 1 Sep".
	text: string
}>()

const model = defineModel<Date>({required: true})

const authStore = useAuthStore()
const open = ref(false)

function pick(day: Date | null) {
	if (day) {
		model.value = day
		open.value = false
	}
}
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="title"
		class="w-72"
	>
		<template #trigger>
			<UiChip
				as="button"
				pressed
				:icon="CalendarDays"
				class="shrink-0 tabular-nums pointer-coarse:h-10 pointer-coarse:px-3"
			>
				{{ text }}
			</UiChip>
		</template>
		<div class="p-3 pointer-coarse:px-4">
			<UiCalendar
				:model-value="model"
				:week-starts-on="authStore.settings.week_start"
				@update:modelValue="pick"
			/>
		</div>
	</UiAdaptivePopover>
</template>
