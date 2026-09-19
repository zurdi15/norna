<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useEventListener, useStorage} from '@vueuse/core'

import {isFormField} from '@/helpers/shortcut'

/** The right-hand column that shows a task next to the page it was opened from. */
const emit = defineEmits<{
	close: []
}>()

const {t} = useI18n()

const MIN_WIDTH = 380
const DEFAULT_WIDTH = 460
const width = useStorage('norna:task-panel-width', DEFAULT_WIDTH)
const maxWidth = () => Math.round(window.innerWidth * 0.55)
const shownWidth = computed(() => Math.min(Math.max(width.value, MIN_WIDTH), maxWidth()))

const resizing = ref(false)

function startResize(event: PointerEvent) {
	const handle = event.currentTarget as HTMLElement
	handle.setPointerCapture(event.pointerId)
	resizing.value = true
	const startX = event.clientX
	const startWidth = shownWidth.value
	const onMove = (move: PointerEvent) => {
		width.value = Math.min(Math.max(startWidth + startX - move.clientX, MIN_WIDTH), maxWidth())
	}
	const onUp = () => {
		resizing.value = false
		handle.removeEventListener('pointermove', onMove)
		handle.removeEventListener('pointerup', onUp)
	}
	handle.addEventListener('pointermove', onMove)
	handle.addEventListener('pointerup', onUp)
}

function resizeWithKeys(event: KeyboardEvent) {
	const step = event.shiftKey ? 80 : 20
	if (event.key === 'ArrowLeft') {
		width.value = Math.min(shownWidth.value + step, maxWidth())
	} else if (event.key === 'ArrowRight') {
		width.value = Math.max(shownWidth.value - step, MIN_WIDTH)
	} else {
		return
	}
	event.preventDefault()
}

// Esc closes the panel unless something inside it (a field, a picker, a menu) takes it first.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
	if (event.key !== 'Escape' || event.defaultPrevented || isFormField(event.target)) {
		return
	}
	if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]')) {
		return
	}
	emit('close')
})
</script>

<template>
	<aside
		:aria-label="t('taskDetail.panel')"
		class="sticky top-0 flex h-dvh shrink-0 border-s border-line bg-surface"
		:style="{width: `${shownWidth}px`}"
	>
		<div
			role="separator"
			aria-orientation="vertical"
			:aria-label="t('taskDetail.resize')"
			:aria-valuenow="shownWidth"
			:aria-valuemin="MIN_WIDTH"
			tabindex="0"
			class="
				absolute inset-y-0 -inset-s-1 z-10 w-2 cursor-col-resize touch-none
				after:absolute after:inset-y-0 after:inset-s-0.75 after:w-0.5 after:transition-colors
				hover:after:bg-accent
				focus-visible:outline-none
				focus-visible:after:bg-accent
			"
			:class="[
				resizing && 'after:bg-accent',
			]"
			@pointerdown="startResize"
			@keydown="resizeWithKeys"
		/>
		<div class="min-w-0 flex-1 overflow-y-auto overscroll-contain">
			<slot />
		</div>
	</aside>
</template>
