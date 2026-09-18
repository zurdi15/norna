<script setup lang="ts">
import {computed, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {Calendar, CalendarX2} from '@lucide/vue'

import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

const props = withDefaults(defineProps<{
	date: Date
	// Done tasks keep their date but lose the urgency colors.
	done?: boolean
	class?: HTMLAttributes['class']
}>(), {
	done: false,
	class: undefined,
})

const {t} = useI18n()
const dates = useTaskDateFormat()

const state = computed(() => props.done ? 'future' : dates.state(props.date))
const text = computed(() => dates.short(props.date))
</script>

<template>
	<time
		:datetime="date.toISOString()"
		:title="t('tasks.row.due', {date: dates.long(date)})"
		:class="cn(
			'inline-flex items-center gap-1 font-mono text-2xs whitespace-nowrap tabular-nums',
			state === 'overdue' ? 'text-danger' : state === 'today' ? 'text-accent' : 'text-ink-muted',
			props.class,
		)"
	>
		<UiIcon
			:icon="state === 'overdue' ? CalendarX2 : Calendar"
			size="xs"
		/>
		{{ text }}
	</time>
</template>
