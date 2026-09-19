<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronsUpDown} from '@lucide/vue'

import {cn} from '@/ui/cn'
import {fieldBoxVariants, useFieldContext} from '@/ui/field'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiListbox from '@/ui/UiListbox.vue'

/** Picks the events a webhook fires on; the picked ones show as chips under the trigger. */
const props = withDefaults(defineProps<{
	events: string[]
	loading?: boolean
}>(), {
	loading: false,
})

const model = defineModel<string[]>({required: true})

const {t} = useI18n()
const field = useFieldContext()
const open = ref(false)
const invalid = computed(() => field?.invalid.value === true)

// Chips follow the server's order, not the order they were picked in.
const picked = computed(() => props.events.filter(event => model.value.includes(event)))
const everything = computed(() => props.events.length > 0 && picked.value.length === props.events.length)

function pick(value: string | number | (string | number)[] | undefined) {
	model.value = Array.isArray(value) ? value.map(String) : []
}
</script>

<template>
	<div class="grid gap-2">
		<UiAdaptivePopover
			v-model:open="open"
			:title="t('projectWebhooks.events')"
			class="w-80"
		>
			<template #trigger>
				<button
					:id="field?.id"
					type="button"
					:aria-describedby="field?.describedBy.value"
					:aria-invalid="invalid ? 'true' : undefined"
					:class="cn(fieldBoxVariants({invalid}), 'cursor-pointer justify-between text-start focus-visible:outline-none')"
				>
					<span
						class="truncate"
						:class="!model.length && 'text-ink-faint'"
					>{{ model.length ? t('projectWebhooks.eventCount', model.length) : t('projectWebhooks.chooseEvents') }}</span>
					<UiIcon
						:icon="ChevronsUpDown"
						size="sm"
						class="text-ink-faint"
					/>
				</button>
			</template>
			<div class="flex items-center gap-1 border-b border-line px-3 py-1.5">
				<span class="flex-1 caption">{{ t('projectWebhooks.pickedOf', {count: picked.length, total: events.length}) }}</span>
				<UiButton
					variant="ghost"
					size="sm"
					class="pointer-coarse:h-10"
					@click="model = [...events]"
				>
					{{ t('projectWebhooks.all') }}
				</UiButton>
				<UiButton
					variant="ghost"
					size="sm"
					class="-me-2 pointer-coarse:h-10"
					@click="model = []"
				>
					{{ t('projectWebhooks.none') }}
				</UiButton>
			</div>
			<UiListbox
				:model-value="model"
				:items="events"
				:item-key="event => event"
				:item-label="event => event"
				:label="t('projectWebhooks.events')"
				:search-placeholder="t('projectWebhooks.searchEvents')"
				:loading="loading"
				multiple
				@update:modelValue="pick"
			>
				<template #item="{item}">
					<span class="min-w-0 flex-1 truncate font-mono text-sm">{{ item }}</span>
				</template>
			</UiListbox>
		</UiAdaptivePopover>
		<ul
			v-if="picked.length"
			role="list"
			class="flex flex-wrap gap-1"
		>
			<li v-if="everything">
				<UiChip
					tone="accent"
					size="sm"
				>
					{{ t('projectWebhooks.allEvents') }}
				</UiChip>
			</li>
			<template v-else>
				<li
					v-for="event in picked"
					:key="event"
				>
					<UiChip
						size="sm"
						class="font-mono"
					>
						{{ event }}
					</UiChip>
				</li>
			</template>
		</ul>
	</div>
</template>
