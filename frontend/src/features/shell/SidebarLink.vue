<script setup lang="ts">
import type {Component, HTMLAttributes} from 'vue'
import type {RouteLocationRaw} from 'vue-router'

import {cn} from '@/ui/cn'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiTooltip from '@/ui/UiTooltip.vue'

const props = withDefaults(defineProps<{
	to: RouteLocationRaw
	label: string
	icon?: Component
	// Project color, shown as a dot instead of an icon.
	color?: string | null
	count?: number
	// Rail mode: icon only, the label becomes a tooltip.
	collapsed?: boolean
	shortcut?: string
	// Highlight on the exact route only (Home would match everything otherwise).
	exact?: boolean
	// Overrides the route match, e.g. a project stays highlighted on any of its views.
	active?: boolean
	class?: HTMLAttributes['class']
}>(), {
	icon: undefined,
	color: undefined,
	count: undefined,
	collapsed: false,
	shortcut: undefined,
	exact: false,
	active: undefined,
	class: undefined,
})
</script>

<template>
	<RouterLink
		v-slot="{href, navigate, isActive, isExactActive}"
		:to="to"
		custom
	>
		<UiTooltip
			:content="label"
			:shortcut="shortcut"
			side="right"
			:disabled="!collapsed"
		>
			<a
				v-shortcut="shortcut ?? ''"
				:href="href"
				:aria-current="(active ?? (exact ? isExactActive : isActive)) ? 'page' : undefined"
				:aria-label="collapsed ? label : undefined"
				:class="cn(
					'group flex h-8 items-center gap-2.5 rounded-md px-2 text-base text-ink-muted transition-colors duration-150',
					'hover:bg-surface hover:text-ink pointer-coarse:h-10',
					'aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-raised',
					'aria-[current=page]:ring-1 aria-[current=page]:ring-line',
					collapsed && 'justify-center px-0',
					props.class,
				)"
				@click="navigate"
			>
				<UiColorDot
					v-if="color !== undefined"
					:color="color"
					class="mx-1"
				/>
				<UiIcon
					v-else-if="icon"
					:icon="icon"
				/>
				<template v-if="!collapsed">
					<span class="min-w-0 flex-1 truncate">{{ label }}</span>
					<span
						v-if="count"
						class="font-mono text-2xs text-ink-faint tabular-nums"
					>{{ count }}</span>
				</template>
			</a>
		</UiTooltip>
	</RouterLink>
</template>
