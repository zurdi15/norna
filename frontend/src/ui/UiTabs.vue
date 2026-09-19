<script setup lang="ts" generic="T extends string">
import type {Component, HTMLAttributes} from 'vue'
import {TabsIndicator, TabsList, TabsRoot, TabsTrigger} from 'reka-ui'

import {cn} from './cn'
import UiIcon from './UiIcon.vue'

export interface UiTab<V extends string> {
	value: V
	label: string
	icon?: Component
	count?: number
}

const props = withDefaults(defineProps<{
	tabs: UiTab<T>[]
	label: string
	class?: HTMLAttributes['class']
}>(), {
	class: undefined,
})

const model = defineModel<T>({required: true})
</script>

<template>
	<TabsRoot
		v-model="model"
		:class="cn('flex min-w-0 flex-col', props.class)"
	>
		<TabsList
			:aria-label="label"
			class="relative flex shrink-0 gap-5 overflow-x-auto border-b border-line"
		>
			<TabsTrigger
				v-for="tab in tabs"
				:key="tab.value"
				:value="tab.value"
				class="
					flex h-10 shrink-0 cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-ink-muted
					transition-colors duration-150
					hover:text-ink
					data-[state=active]:text-ink
				"
			>
				<UiIcon
					v-if="tab.icon"
					:icon="tab.icon"
					size="sm"
				/>
				{{ tab.label }}
				<span
					v-if="tab.count !== undefined"
					class="font-mono text-2xs text-ink-faint"
				>{{ tab.count }}</span>
			</TabsTrigger>
			<TabsIndicator
				class="
					absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size)
					translate-x-(--reka-tabs-indicator-position) rounded-full bg-ink transition-[width,translate]
					duration-200 ease-out
				"
			/>
		</TabsList>
		<slot />
	</TabsRoot>
</template>
