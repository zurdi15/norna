<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import type {ProjectView} from '@/client/generated'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

import {VIEW_ICONS, viewTitle} from './viewKinds'

/** The project's views as links: each view has its own url, so this is navigation, not tabs. */
defineProps<{
	projectId: number
	views: readonly ProjectView[]
	currentViewId: number
}>()

const {t} = useI18n()
</script>

<template>
	<nav
		:aria-label="t('projectView.views')"
		class="flex min-w-0 scrollbar-none gap-1 overflow-x-auto md:gap-5"
	>
		<RouterLink
			v-for="view in views"
			:key="view.id"
			:to="{name: 'project.view', params: {projectId, viewId: view.id}}"
			:aria-current="view.id === currentViewId ? 'page' : undefined"
			:class="cn(
				'flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-ink-muted transition-colors hover:text-ink',
				// Pills on phones, underlined tabs from md up.
				'h-8 rounded-md px-2.5 aria-[current=page]:bg-canvas-subtle aria-[current=page]:text-ink',
				'md:-mb-px md:h-10 md:rounded-none md:border-b-[1.5px] md:border-transparent md:px-0',
				'md:aria-[current=page]:border-ink md:aria-[current=page]:bg-transparent',
				'pointer-coarse:h-10',
			)"
		>
			<UiIcon
				v-if="view.view_kind"
				:icon="VIEW_ICONS[view.view_kind]"
				size="sm"
			/>
			{{ viewTitle(view, t) }}
		</RouterLink>
	</nav>
</template>
