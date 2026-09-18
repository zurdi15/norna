<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {Task} from '@/client/generated'
import type {GanttBarDateType, GanttDragMode} from '@/composables/useGanttBar'
import {getTaskColor} from '@/modules/task/task'
import {cn} from '@/ui/cn'

/**
 * One task's bar on the timeline. A button: click or Enter opens the task; with editing
 * on, the body drags it, the ends resize it and the arrow keys move it (handled above).
 */
const props = defineProps<{
	task: Task
	type: GanttBarDateType
	derived: boolean
	left: number
	width: number
	height: number
	/** The bar goes on past the start or end of the range. */
	cutStart: boolean
	cutEnd: boolean
	editable: boolean
	/** Being dragged or moved with the keys. */
	active: boolean
	label: string
	dates: string
	/** Where the visible part of the timeline begins, in px: a bar that starts off screen keeps its title in view. */
	visibleFrom: number
}>()

const emit = defineEmits<{
	drag: [event: PointerEvent, mode: GanttDragMode]
	open: []
	keydown: [event: KeyboardEvent]
	focus: [event: FocusEvent]
}>()

const {t} = useI18n()

// Tasks carry their own color; the tint and edge are mixed from it so any hue reads on both themes.
const style = computed(() => {
	const color = getTaskColor(props.task) ?? 'var(--color-accent)'
	return {
		left: `${props.left}px`,
		width: `${props.width}px`,
		height: `${props.height}px`,
		'--bar-fill': `color-mix(in oklch, ${color} 24%, var(--color-surface))`,
		'--bar-fill-strong': `color-mix(in oklch, ${color} 36%, var(--color-surface))`,
		'--bar-fill-open': `color-mix(in oklch, ${color} 44%, var(--color-surface))`,
		'--bar-edge': `color-mix(in oklch, ${color} 72%, var(--color-ink))`,
	}
})

// Long enough for a few words inside; shorter bars carry their title beside them.
const labelInside = computed(() => props.width >= 72)
const labelShift = computed(() => Math.min(Math.max(props.visibleFrom - props.left, 0), Math.max(props.width - 64, 0)))
const canResizeStart = computed(() => props.editable && !props.derived && !props.cutStart)
const canResizeEnd = computed(() => props.editable && !props.derived && !props.cutEnd)
</script>

<template>
	<button
		type="button"
		:aria-label="label"
		:aria-description="editable && !derived ? t('projectView.gantt.editHint') : undefined"
		:aria-keyshortcuts="editable && !derived ? 'ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Control+ArrowLeft Control+ArrowRight' : undefined"
		data-gantt-bar
		:class="cn(
			'group/bar absolute top-1/2 z-2 flex -translate-y-1/2 items-center rounded-sm text-start text-xs text-ink',
			'cursor-pointer outline-offset-2 select-none focus-visible:outline-2 focus-visible:outline-accent',
			'transition-[background-color,box-shadow] duration-150',
			type === 'both' && !derived && 'border border-(--bar-edge)/50 bg-(--bar-fill) hover:bg-(--bar-fill-strong)',
			// Open-ended bars fade out on the side without a date and carry a solid cap on the known one.
			type === 'startOnly' && !derived && `
				border-s-2 border-(--bar-edge) bg-linear-to-r from-(--bar-fill-open) to-transparent
			`,
			type === 'endOnly' && !derived && `
				justify-end border-e-2 border-(--bar-edge) bg-linear-to-l from-(--bar-fill-open) to-transparent
			`,
			derived && 'border border-dashed border-(--bar-edge)/70',
			cutStart && 'rounded-s-none border-s-0',
			cutEnd && 'rounded-e-none border-e-0',
			task.done && 'opacity-55',
			editable && !derived && 'cursor-grab',
			active && 'z-3 cursor-grabbing shadow-raised ring-1 ring-accent',
		)"
		:style="style"
		@pointerdown="event => emit('drag', event, 'move')"
		@click="emit('open')"
		@keydown="event => emit('keydown', event)"
		@focus="event => emit('focus', event)"
	>
		<span
			v-if="labelInside"
			:class="cn('truncate px-2 font-medium', task.done && 'text-ink-muted line-through decoration-ink-faint')"
			:style="labelShift > 0 ? {paddingInlineStart: `${labelShift + 8}px`} : undefined"
		>{{ task.title }}</span>
		<span
			v-else
			:class="cn(
				'pointer-events-none absolute inset-s-full ms-1.5 whitespace-nowrap text-ink-muted',
				task.done && 'line-through decoration-ink-faint',
			)"
		>{{ task.title }}</span>

		<span
			v-if="canResizeStart"
			class="absolute inset-y-0 -inset-s-1.5 flex w-3 cursor-ew-resize items-center justify-center"
			aria-hidden="true"
			@pointerdown.stop="event => emit('drag', event, 'start')"
		>
			<span class="h-3 w-0.5 rounded-full bg-(--bar-edge) opacity-0 transition-opacity group-hover/bar:opacity-100" />
		</span>
		<span
			v-if="canResizeEnd"
			class="absolute inset-y-0 -inset-e-1.5 flex w-3 cursor-ew-resize items-center justify-center"
			aria-hidden="true"
			@pointerdown.stop="event => emit('drag', event, 'end')"
		>
			<span class="h-3 w-0.5 rounded-full bg-(--bar-edge) opacity-0 transition-opacity group-hover/bar:opacity-100" />
		</span>

		<span
			:class="cn(
				'pointer-events-none absolute bottom-full mb-1 rounded-sm bg-ink px-1.5 py-0.5 font-mono text-3xs',
				'whitespace-nowrap text-canvas shadow-overlay transition-opacity duration-150',
				active
					? 'opacity-100'
					: 'opacity-0 group-hover/bar:opacity-100 group-hover/bar:delay-500 group-focus-visible/bar:opacity-100',
			)"
			:style="{left: `${labelShift}px`}"
			aria-hidden="true"
		>{{ dates }}</span>
	</button>
</template>
