<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {ArrowUpDown} from '@lucide/vue'

import type {SortBy} from '@/composables/useTaskList'
import type {UiMenuEntry} from '@/ui/menu'
import UiButton from '@/ui/UiButton.vue'
import UiMenu from '@/ui/UiMenu.vue'

/** The orders a list offers, by hand first. The server breaks ties by id. */
const sortBy = defineModel<SortBy>({required: true})

const {t} = useI18n()

const OPTIONS = [
	{key: 'position', sort: {position: 'asc'}},
	{key: 'due_date', sort: {due_date: 'asc', id: 'desc'}},
	{key: 'priority', sort: {priority: 'desc', id: 'desc'}},
	{key: 'title', sort: {title: 'asc'}},
	{key: 'created', sort: {created: 'desc'}},
	{key: 'updated', sort: {updated: 'desc'}},
] as const satisfies readonly {key: keyof SortBy, sort: SortBy}[]

const current = computed(() => OPTIONS.find(option => option.key === Object.keys(sortBy.value)[0]) ?? OPTIONS[0])

const items = computed<UiMenuEntry[]>(() => OPTIONS.map(option => ({
	label: t(`projectView.sort.${option.key}`),
	checked: option.key === current.value.key,
	onSelect: () => sortBy.value = {...option.sort},
})))
</script>

<template>
	<UiMenu
		:items="items"
		:title="t('projectView.sort.heading')"
	>
		<template #trigger>
			<UiButton
				variant="ghost"
				size="sm"
				:icon="ArrowUpDown"
				:aria-label="t('projectView.sort.current', {order: t(`projectView.sort.${current.key}`)})"
				class="shrink-0 text-ink-muted"
			>
				<span class="hidden @md:inline">{{ t(`projectView.sort.${current.key}`) }}</span>
			</UiButton>
		</template>
	</UiMenu>
</template>
