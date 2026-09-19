<script setup lang="ts">
import {ref} from 'vue'
import {ChevronsUpDown} from '@lucide/vue'

import {cn} from '@/ui/cn'
import {fieldBoxVariants} from '@/ui/field'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiIcon from '@/ui/UiIcon.vue'

/**
 * A setting picked from a long, searchable list: looks like a select, opens the list
 * in a popover (a sheet on phones). The list goes in the default slot and gets `close`.
 */
withDefaults(defineProps<{
	// Names the popover or sheet.
	title: string
	// What the button shows; the placeholder while empty.
	text?: string
	placeholder?: string
	id?: string
	describedBy?: string
}>(), {
	text: undefined,
	placeholder: undefined,
	id: undefined,
	describedBy: undefined,
})

const open = ref(false)
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="title"
		class="w-80"
	>
		<template #trigger>
			<button
				:id="id"
				type="button"
				:aria-describedby="describedBy"
				:class="cn(fieldBoxVariants(), 'cursor-pointer justify-between text-start focus-visible:outline-none')"
			>
				<span class="flex min-w-0 items-center gap-2">
					<slot name="leading" />
					<span
						class="truncate"
						:class="!text && 'text-ink-faint'"
					>{{ text || placeholder }}</span>
				</span>
				<UiIcon
					:icon="ChevronsUpDown"
					size="sm"
					class="text-ink-faint"
				/>
			</button>
		</template>
		<slot :close="() => open = false" />
	</UiAdaptivePopover>
</template>
