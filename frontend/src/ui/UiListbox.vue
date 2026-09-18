<script setup lang="ts" generic="T, K extends string | number">
import {computed, type HTMLAttributes} from 'vue'
import {ListboxContent, ListboxFilter, ListboxItem, ListboxItemIndicator, ListboxRoot} from 'reka-ui'
import {useI18n} from 'vue-i18n'
import {Check, Plus, Search} from '@lucide/vue'

import {cn} from './cn'
import {matchesSearch, normalizeForSearch} from './search'
import UiIcon from './UiIcon.vue'
import UiSpinner from './UiSpinner.vue'

/**
 * Search box plus keyboard-navigable options: the body of every picker.
 * Filters locally by default; set `filter="none"` and watch `v-model:query` to search remotely.
 */
const props = withDefaults(defineProps<{
	items: T[]
	itemKey: (item: T) => K
	itemLabel: (item: T) => string
	label: string
	multiple?: boolean
	searchable?: boolean
	searchPlaceholder?: string
	emptyText?: string
	// Offers "Create “query”" when nothing matches the query exactly.
	creatable?: boolean
	filter?: 'local' | 'none'
	loading?: boolean
	class?: HTMLAttributes['class']
}>(), {
	multiple: false,
	searchable: true,
	searchPlaceholder: undefined,
	emptyText: undefined,
	creatable: false,
	filter: 'local',
	loading: false,
	class: undefined,
})

const emit = defineEmits<{
	create: [query: string]
	// Fires for every pick, so single pickers can close right away.
	select: [key: K]
}>()
const model = defineModel<K | K[] | undefined>({default: undefined})
const query = defineModel<string>('query', {default: ''})

const {t} = useI18n()

// Reka needs a value on every item; this one is never stored because its select is cancelled.
const CREATE_VALUE = '__ui-listbox-create__'

const visible = computed(() => props.filter === 'none'
	? props.items
	: props.items.filter(item => matchesSearch(props.itemLabel(item), query.value)))

const canCreate = computed(() => {
	const wanted = normalizeForSearch(query.value)
	return props.creatable
		&& wanted !== ''
		&& !props.items.some(item => normalizeForSearch(props.itemLabel(item)) === wanted)
})

function onCreate(event: Event) {
	event.preventDefault()
	emit('create', query.value.trim())
}

const itemClass = [
	'flex h-8 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-base outline-none select-none',
	'data-disabled:opacity-50 data-highlighted:bg-canvas-subtle pointer-coarse:h-11 pointer-coarse:text-md',
]
</script>

<template>
	<ListboxRoot
		v-model="model"
		:multiple="multiple"
		:selection-behavior="multiple ? 'toggle' : 'replace'"
		highlight-on-hover
		:class="cn('flex min-h-0 flex-col', props.class)"
	>
		<div
			v-if="searchable"
			class="flex items-center gap-2 border-b border-line px-3"
		>
			<UiIcon
				:icon="Search"
				class="text-ink-faint"
			/>
			<ListboxFilter
				v-model="query"
				auto-focus
				:aria-label="label"
				:placeholder="searchPlaceholder ?? t('ui.listbox.search')"
				class="
					h-10 min-w-0 flex-1 bg-transparent text-base
					placeholder:text-ink-faint
					focus:outline-none
					pointer-coarse:h-12 pointer-coarse:text-lg
				"
			/>
			<UiSpinner
				v-if="loading"
				class="text-ink-faint"
			/>
		</div>
		<ListboxContent
			:aria-label="label"
			class="max-h-72 min-h-0 overflow-y-auto p-1 pointer-coarse:max-h-none"
		>
			<ListboxItem
				v-for="item in visible"
				:key="itemKey(item)"
				:value="itemKey(item)"
				:class="itemClass"
				@select="emit('select', itemKey(item))"
			>
				<slot
					name="item"
					:item="item"
				>
					<span class="min-w-0 flex-1 truncate">{{ itemLabel(item) }}</span>
				</slot>
				<ListboxItemIndicator class="ms-auto text-accent">
					<UiIcon :icon="Check" />
				</ListboxItemIndicator>
			</ListboxItem>
			<ListboxItem
				v-if="canCreate"
				:value="CREATE_VALUE"
				class="text-accent"
				:class="[itemClass]"
				@select="onCreate"
			>
				<UiIcon :icon="Plus" />
				<span class="min-w-0 flex-1 truncate">{{ t('ui.listbox.create', {query: query.trim()}) }}</span>
			</ListboxItem>
			<p
				v-if="!visible.length && !canCreate && !loading"
				class="px-2 py-6 text-center text-sm text-ink-faint"
			>
				{{ emptyText ?? t('ui.listbox.empty') }}
			</p>
		</ListboxContent>
	</ListboxRoot>
</template>
