<script setup lang="ts">
import {computed, ref, useId, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {ListFilter} from '@lucide/vue'

import {iconButtonSizes} from '@/ui/button'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

import {useFilterConversion, useFilterData} from './filterData'
import FilterInput from './FilterInput.vue'
import {countFilterConditions, hidesDoneTasks, setShowDoneTasks} from './filterQuery'
import FilterSyntaxHelp from './FilterSyntaxHelp.vue'

export interface TaskFilterValue {
	// In the api's format.
	filter: string
	filter_include_nulls: boolean
}

/**
 * The "Filter" button of a task view and its editor: the query with suggestions, switches for
 * done tasks and tasks without dates, and the syntax. Changes apply with Apply (or Enter in the
 * query); Escape and clicking outside drop them.
 */
const props = defineProps<{
	// Suggests the project's members and leaves the project field out.
	projectId?: number
}>()

const model = defineModel<TaskFilterValue>({required: true})

const {t} = useI18n()
const {isMd, hasFinePointer} = useBreakpoints()
const data = useFilterData()
const {toApi, fromApi} = useFilterConversion(data)

const input = useTemplateRef<InstanceType<typeof FilterInput>>('input')
const doneId = useId()
const nullsId = useId()
const nullsHintId = useId()

const open = ref(false)
// In the display format: names instead of ids.
const draft = ref('')
const includeNulls = ref(false)
const helpOpen = ref(false)
// The draft as first shown; while it's untouched it follows labels and projects as they load.
let initialDraft = ''

watch(open, isOpen => {
	if (!isOpen) {
		return
	}
	initialDraft = fromApi(model.value.filter)
	draft.value = initialDraft
	includeNulls.value = model.value.filter_include_nulls
})

watch([data.labels, data.projects], () => {
	if (open.value && draft.value === initialDraft) {
		initialDraft = fromApi(model.value.filter)
		draft.value = initialDraft
	}
})

const showDone = computed({
	get: () => !hidesDoneTasks(draft.value),
	set: show => {
		draft.value = setShowDoneTasks(draft.value, show)
	},
})

const active = computed(() => model.value.filter.trim() !== '')
// Anything unparsable still counts as one, so an active filter never reads as zero.
const conditions = computed(() => active.value ? Math.max(1, countFilterConditions(model.value.filter)) : 0)
const activeLabel = computed(() => t('filters.activeCount', {count: conditions.value}, conditions.value))
const canClear = computed(() => active.value || model.value.filter_include_nulls || draft.value.trim() !== '')

function commit(next: TaskFilterValue) {
	if (next.filter !== model.value.filter || next.filter_include_nulls !== model.value.filter_include_nulls) {
		model.value = next
	}
	open.value = false
}

function apply() {
	commit({filter: toApi(draft.value), filter_include_nulls: includeNulls.value})
}

function clear() {
	commit({filter: '', filter_include_nulls: false})
}
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="t('filters.title')"
		align="end"
		class="w-88"
	>
		<template #trigger>
			<UiButton
				v-if="isMd"
				variant="ghost"
				size="sm"
				:icon="ListFilter"
				:class="active && 'text-accent hover:text-accent'"
			>
				{{ t('projectView.filter') }}
				<template v-if="active">
					<span
						class="
							-me-1 inline-grid h-4 min-w-4 place-items-center rounded-sm bg-accent-subtle px-1 font-mono
							text-2xs text-accent tabular-nums
						"
						aria-hidden="true"
					>{{ conditions }}</span>
					<span class="sr-only">, {{ activeLabel }}</span>
				</template>
			</UiButton>
			<!-- Phones share the row with the view switcher: icon only, with a dot while a filter is on. -->
			<UiButton
				v-else
				variant="ghost"
				:class="cn(iconButtonSizes.md, active && 'text-accent hover:text-accent')"
				:aria-label="active ? `${t('projectView.filter')}, ${activeLabel}` : t('projectView.filter')"
			>
				<UiIcon :icon="ListFilter" />
				<span
					v-if="active"
					class="absolute inset-e-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-canvas"
					aria-hidden="true"
				/>
			</UiButton>
		</template>

		<!-- On a phone the sheet focuses the form, not the query: the keyboard would cover the switches. -->
		<form
			:class="cn('grid gap-3 focus:outline-none', isMd ? 'p-3' : 'px-5 pt-1 pb-3')"
			:data-autofocus="isMd ? undefined : ''"
			:tabindex="isMd ? undefined : -1"
			@submit.prevent="apply"
		>
			<FilterInput
				ref="input"
				v-model="draft"
				:project-id="projectId"
				:autofocus="hasFinePointer"
				@submit="apply"
				@cancel="open = false"
			/>

			<div class="grid">
				<div class="flex min-h-9 items-center gap-3 pointer-coarse:min-h-11">
					<label
						:for="doneId"
						class="min-w-0 flex-1 cursor-pointer text-base pointer-coarse:text-md"
					>{{ t('filters.showDone') }}</label>
					<UiSwitch
						:id="doneId"
						v-model="showDone"
					/>
				</div>
				<div class="flex min-h-9 items-center gap-3 py-1 pointer-coarse:min-h-11">
					<div class="grid min-w-0 flex-1">
						<label
							:for="nullsId"
							class="cursor-pointer text-base pointer-coarse:text-md"
						>{{ t('filters.includeNulls') }}</label>
						<p
							:id="nullsHintId"
							class="text-xs text-ink-faint"
						>
							{{ t('filters.includeNullsHint') }}
						</p>
					</div>
					<UiSwitch
						:id="nullsId"
						v-model="includeNulls"
						:aria-describedby="nullsHintId"
					/>
				</div>
			</div>

			<FilterSyntaxHelp
				v-model:open="helpOpen"
				:show-project="props.projectId === undefined"
				@insert="input?.insert($event)"
			/>

			<div
				:class="cn(
					'border-t border-line pt-3',
					isMd ? 'flex items-center justify-end gap-2' : 'grid grid-cols-2 gap-2',
				)"
			>
				<UiButton
					variant="ghost"
					:size="isMd ? 'sm' : 'md'"
					:disabled="!canClear"
					@click="clear"
				>
					{{ t('filters.clear') }}
				</UiButton>
				<UiButton
					type="submit"
					variant="primary"
					:size="isMd ? 'sm' : 'md'"
				>
					{{ t('projectView.applyFilter') }}
				</UiButton>
			</div>
		</form>
	</UiAdaptivePopover>
</template>
