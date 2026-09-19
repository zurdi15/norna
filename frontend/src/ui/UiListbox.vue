<script setup lang="ts" generic="T, K extends string | number">
import {computed, useId, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {Check, Plus, Search} from '@lucide/vue'

import {cn} from './cn'
import {useListNavigation} from './composables/useListNavigation'
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

const listId = useId()

type Option = {kind: 'item', key: K, item: T} | {kind: 'create'}

const visible = computed(() => props.filter === 'none'
	? props.items
	: props.items.filter(item => matchesSearch(props.itemLabel(item), query.value)))

const canCreate = computed(() => {
	const wanted = normalizeForSearch(query.value)
	return props.creatable
		&& wanted !== ''
		&& !props.items.some(item => normalizeForSearch(props.itemLabel(item)) === wanted)
})

const options = computed<Option[]>(() => [
	...visible.value.map(item => ({kind: 'item' as const, key: props.itemKey(item), item})),
	...(canCreate.value ? [{kind: 'create' as const}] : []),
])

function isSelected(key: K): boolean {
	return Array.isArray(model.value) ? model.value.includes(key) : model.value === key
}

function pick(option: Option) {
	if (option.kind === 'create') {
		emit('create', query.value.trim())
		return
	}
	if (props.multiple) {
		const current = Array.isArray(model.value) ? model.value : []
		model.value = isSelected(option.key)
			? current.filter(key => key !== option.key)
			: [...current, option.key]
	} else {
		model.value = option.key
	}
	emit('select', option.key)
}

function optionKey(option: Option): string {
	// Prefixed so no item key can collide with the create option.
	return option.kind === 'create' ? 'create' : `item-${option.key}`
}

const nav = useListNavigation({
	items: options,
	getKey: optionKey,
	onSelect: pick,
	idPrefix: listId,
	// A single picker opens on its current value; typing moves to the top match.
	initialIndex: () => props.multiple || query.value !== ''
		? 0
		: options.value.findIndex(option => option.kind === 'item' && isSelected(option.key)),
})

// Without a search box the list itself takes focus; Space toggles like a native listbox.
function onListKeydown(event: KeyboardEvent) {
	if (event.key === ' ' && nav.activeItem.value !== undefined) {
		event.preventDefault()
		pick(nav.activeItem.value)
		return
	}
	nav.onKeydown(event)
}

// Touch has no keyboard cursor to show: a tap only flashes the row it lands on.
const optionClass = [
	'flex h-8 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-base select-none',
	'pointer-fine:data-highlighted:bg-canvas-subtle',
	'pointer-coarse:h-11 pointer-coarse:text-md pointer-coarse:active:bg-canvas-subtle',
]
</script>

<template>
	<div :class="cn('flex min-h-0 flex-col', props.class)">
		<div
			v-if="searchable"
			class="flex items-center gap-2 border-b border-line px-3"
		>
			<UiIcon
				:icon="Search"
				class="text-ink-faint"
			/>
			<input
				v-model="query"
				data-autofocus
				type="text"
				role="combobox"
				aria-expanded="true"
				aria-autocomplete="list"
				:aria-controls="listId"
				:aria-activedescendant="nav.activeDescendant.value"
				:aria-label="label"
				:placeholder="searchPlaceholder ?? t('ui.listbox.search')"
				autocomplete="off"
				spellcheck="false"
				class="
					h-10 min-w-0 flex-1 bg-transparent text-base
					placeholder:text-ink-faint
					focus:outline-none
					pointer-coarse:h-12 pointer-coarse:text-lg
				"
				@keydown="nav.onKeydown"
			>
			<UiSpinner
				v-if="loading"
				class="text-ink-faint"
			/>
		</div>
		<div
			:id="listId"
			role="listbox"
			:aria-label="label"
			:aria-multiselectable="multiple || undefined"
			:aria-activedescendant="searchable ? undefined : nav.activeDescendant.value"
			:tabindex="searchable ? undefined : 0"
			:data-autofocus="searchable ? undefined : ''"
			class="max-h-72 min-h-0 overflow-y-auto p-1 focus-visible:outline-none pointer-coarse:max-h-none"
			@keydown="searchable || onListKeydown($event)"
		>
			<!-- mousedown.prevent keeps the focus in the search box while picking with the pointer. -->
			<div
				v-for="(option, index) in options"
				:id="nav.optionId(option)"
				:key="optionKey(option)"
				role="option"
				:aria-selected="option.kind === 'item' && isSelected(option.key)"
				:data-highlighted="nav.activeIndex.value === index ? '' : undefined"
				:class="cn(optionClass, option.kind === 'create' && 'text-accent')"
				@mousedown.prevent
				@mousemove="nav.setActive(index)"
				@click="pick(option)"
			>
				<template v-if="option.kind === 'item'">
					<slot
						name="item"
						:item="option.item"
					>
						<span class="min-w-0 flex-1 truncate">{{ itemLabel(option.item) }}</span>
					</slot>
					<UiIcon
						v-if="isSelected(option.key)"
						:icon="Check"
						class="ms-auto text-accent"
					/>
				</template>
				<template v-else>
					<UiIcon :icon="Plus" />
					<span class="min-w-0 flex-1 truncate">{{ t('ui.listbox.create', {query: query.trim()}) }}</span>
				</template>
			</div>
			<p
				v-if="!options.length && !loading"
				class="px-2 py-6 text-center text-sm text-ink-faint"
			>
				{{ emptyText ?? t('ui.listbox.empty') }}
			</p>
		</div>
	</div>
</template>
