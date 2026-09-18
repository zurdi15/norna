import {computed, nextTick, ref, watch, type Ref} from 'vue'

/**
 * Keyboard navigation for a search box driving a list (the combobox pattern): focus stays
 * in the input, arrows move an active option, Enter picks it. The active option resets
 * whenever the list changes (to the first one by default), so typing then Enter always
 * takes the top match.
 */
export function useListNavigation<T>(options: {
	items: Ref<readonly T[]>
	getKey: (item: T) => string | number
	onSelect: (item: T) => void
	// Prefix for option element ids, so aria-activedescendant can point at them.
	idPrefix: string
	// Where the active option starts, e.g. on the current value of a single picker.
	initialIndex?: () => number
}) {
	function initial(): number {
		const index = options.initialIndex?.() ?? 0
		return index >= 0 && index < options.items.value.length ? index : 0
	}

	const activeIndex = ref(initial())

	// Keys joined with a unit separator, which no key contains.
	watch(() => options.items.value.map(options.getKey).join(''), () => {
		activeIndex.value = initial()
	})

	const activeItem = computed(() => options.items.value[activeIndex.value])

	function optionId(item: T): string {
		return `${options.idPrefix}-${options.getKey(item)}`
	}

	const activeDescendant = computed(() => activeItem.value === undefined ? undefined : optionId(activeItem.value))

	function setActive(index: number) {
		const count = options.items.value.length
		if (count === 0) {
			return
		}
		activeIndex.value = (index + count) % count
		nextTick(() => {
			if (activeDescendant.value) {
				document.getElementById(activeDescendant.value)?.scrollIntoView({block: 'nearest'})
			}
		})
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.isComposing) {
			return
		}
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				setActive(activeIndex.value + 1)
				break
			case 'ArrowUp':
				event.preventDefault()
				setActive(activeIndex.value - 1)
				break
			// In a search box Home and End keep moving the text cursor.
			case 'Home':
			case 'End':
				if (event.target instanceof HTMLInputElement) {
					return
				}
				event.preventDefault()
				setActive(event.key === 'Home' ? 0 : options.items.value.length - 1)
				break
			case 'Enter':
				if (activeItem.value !== undefined) {
					event.preventDefault()
					options.onSelect(activeItem.value)
				}
				break
		}
	}

	return {
		activeIndex,
		activeItem,
		activeDescendant,
		optionId,
		setActive,
		onKeydown,
	}
}
