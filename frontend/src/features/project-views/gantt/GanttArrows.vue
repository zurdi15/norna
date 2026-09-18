<script setup lang="ts">
import {useId} from 'vue'

import {arrowPath, type GanttArrow} from '@/helpers/ganttRelationArrows'
import {cn} from '@/ui/cn'

/** Dependency arrows over the rows: blocking in the danger tone, precedes as a dashed thread. */
defineProps<{
	arrows: GanttArrow[]
	width: number
	height: number
	rowHeight: number
}>()

const id = useId()
</script>

<template>
	<svg
		class="pointer-events-none absolute top-0 z-1 overflow-visible"
		:width="width"
		:height="height"
		aria-hidden="true"
	>
		<defs>
			<marker
				:id="`${id}-blocking`"
				viewBox="0 0 6 6"
				markerWidth="6"
				markerHeight="6"
				refX="5"
				refY="3"
				orient="auto"
			>
				<path
					d="M0,0 L6,3 L0,6 Z"
					class="fill-danger"
				/>
			</marker>
			<marker
				:id="`${id}-precedes`"
				viewBox="0 0 6 6"
				markerWidth="6"
				markerHeight="6"
				refX="5"
				refY="3"
				orient="auto"
			>
				<path
					d="M0,0 L6,3 L0,6 Z"
					class="fill-ink-faint"
				/>
			</marker>
		</defs>
		<path
			v-for="arrow in arrows"
			:key="`${arrow.fromTaskId}-${arrow.toTaskId}-${arrow.relationKind}`"
			:d="arrowPath(arrow, rowHeight)"
			fill="none"
			stroke-width="1.25"
			:stroke-dasharray="arrow.relationKind === 'precedes' ? '4 3' : undefined"
			:marker-end="`url(#${id}-${arrow.relationKind})`"
			:class="cn('opacity-80', arrow.relationKind === 'blocking' ? 'stroke-danger' : 'stroke-ink-faint')"
		/>
	</svg>
</template>
