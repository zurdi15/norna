<script setup lang="ts" generic="T">
import {onBeforeUnmount, toRef, watch, type HTMLAttributes} from 'vue'
import type {Editor} from '@tiptap/core'

import {cn} from '@/ui/cn'
import {useListNavigation} from '@/ui/composables/useListNavigation'

import {nextSuggestionListId} from './suggestionRenderer'

/**
 * The popup list behind "/", "@" and ":". Focus stays in the editor, which acts as the
 * combobox: arrows move the active option, Enter or Tab picks it.
 */
const props = withDefaults(defineProps<{
	items: T[]
	editor: Editor
	itemKey: (item: T) => string | number
	label: string
	emptyText: string
	class?: HTMLAttributes['class']
}>(), {
	class: undefined,
})

const emit = defineEmits<{
	select: [item: T]
}>()

const listId = nextSuggestionListId()

const nav = useListNavigation({
	items: toRef(props, 'items'),
	getKey: item => props.itemKey(item),
	onSelect: item => emit('select', item),
	idPrefix: listId,
})

const COMBOBOX_ATTRIBUTES = ['aria-controls', 'aria-expanded', 'aria-autocomplete', 'aria-activedescendant']

watch(nav.activeDescendant, id => {
	const dom = props.editor.view.dom
	dom.setAttribute('aria-controls', listId)
	dom.setAttribute('aria-expanded', 'true')
	dom.setAttribute('aria-autocomplete', 'list')
	if (id) {
		dom.setAttribute('aria-activedescendant', id)
	} else {
		dom.removeAttribute('aria-activedescendant')
	}
}, {immediate: true})

onBeforeUnmount(() => {
	if (props.editor.isDestroyed) {
		return
	}
	COMBOBOX_ATTRIBUTES.forEach(name => props.editor.view.dom.removeAttribute(name))
})

function onKeyDown(event: KeyboardEvent): boolean {
	// Home and End keep moving the caret; an empty list lets every key through.
	if (props.items.length === 0 || event.key === 'Home' || event.key === 'End') {
		return false
	}
	if (event.key === 'Tab' && !event.shiftKey && nav.activeItem.value !== undefined) {
		emit('select', nav.activeItem.value)
		return true
	}
	nav.onKeydown(event)
	return event.defaultPrevented
}

defineExpose({onKeyDown})
</script>

<template>
	<!-- mousedown.prevent keeps the focus (and the on-screen keyboard) in the editor. -->
	<div
		:id="listId"
		role="listbox"
		:aria-label="label"
		:class="cn(
			'max-h-[min(20rem,45dvh)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain',
			'rounded-lg border border-line bg-surface-raised p-1 text-ink shadow-overlay',
			'animate-pop-in',
			props.class,
		)"
		@mousedown.prevent
	>
		<div
			v-for="(item, index) in items"
			:id="nav.optionId(item)"
			:key="itemKey(item)"
			role="option"
			:aria-selected="nav.activeIndex.value === index"
			:data-highlighted="nav.activeIndex.value === index ? '' : undefined"
			class="
				flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1 select-none
				data-highlighted:bg-canvas-subtle
				pointer-coarse:min-h-11
			"
			@mousemove="nav.activeIndex.value === index || nav.setActive(index)"
			@click="emit('select', item)"
		>
			<slot
				name="item"
				:item="item"
			/>
		</div>
		<p
			v-if="items.length === 0"
			class="px-2 py-3 text-center text-sm text-ink-faint"
		>
			{{ emptyText }}
		</p>
	</div>
</template>
