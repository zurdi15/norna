import {computed, onScopeDispose, shallowRef, watch, type Ref} from 'vue'

// The dialogs open right now, oldest first.
const stack = shallowRef<symbol[]>([])

function remove(layer: symbol) {
	stack.value = stack.value.filter(entry => entry !== layer)
}

/**
 * The z-index of a dialog and of its backdrop, so that dialogs stack in the order
 * they open: a confirmation or a picker sheet opened from a dialog covers it, and
 * its backdrop dims it. Their teleports alone can't promise that, since each lands
 * in the page where its component was mounted, not where it opened.
 */
export function useLayerStack(open: Ref<boolean>) {
	const layer = Symbol('layer')

	watch(open, isOpen => {
		remove(layer)
		if (isOpen) {
			stack.value = [...stack.value, layer]
		}
	}, {immediate: true})
	onScopeDispose(() => remove(layer))

	// A closing dialog has left the stack but still animates out: it stays on top.
	const depth = computed(() => {
		const index = stack.value.indexOf(layer)
		return index === -1 ? stack.value.length : index
	})

	return {
		backdropStyle: computed(() => ({zIndex: `calc(var(--z-modal) + ${depth.value * 2})`})),
		contentStyle: computed(() => ({zIndex: `calc(var(--z-modal) + ${depth.value * 2 + 1})`})),
	}
}
