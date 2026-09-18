<script setup lang="ts">
import {computed, type Component} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {CalendarDays, FolderKanban, House, Plus, Search} from '@lucide/vue'

import {useShellStore} from '@/stores/shell'
import {cn} from '@/ui/cn'
import {useKeyboardInset} from '@/ui/composables/useKeyboardInset'
import UiIcon from '@/ui/UiIcon.vue'

const {t} = useI18n()
const route = useRoute()
const shell = useShellStore()
const keyboardInset = useKeyboardInset()

const routeName = computed(() => String(route.name ?? ''))

interface NavItem {
	label: string
	icon: Component
	to?: {name: string}
	active?: boolean
	onClick?: () => void
}

const items = computed<NavItem[]>(() => [
	{label: t('shell.nav.home'), icon: House, to: {name: 'home'}, active: routeName.value === 'home'},
	{label: t('shell.nav.upcoming'), icon: CalendarDays, to: {name: 'tasks.range'}, active: routeName.value === 'tasks.range'},
	{
		label: t('shell.nav.projects'),
		icon: FolderKanban,
		to: {name: 'projects.index'},
		active: /^(project|projects|filter|filters)\./.test(routeName.value),
	},
	{label: t('shell.search'), icon: Search, onClick: () => shell.commandPaletteOpen = true},
])

const itemClass = 'flex flex-col items-center justify-center gap-0.5 text-3xs font-medium text-ink-faint aria-[current=page]:text-ink'
</script>

<template>
	<!-- Hidden while the keyboard is open (iOS): it would sit on top of the field being typed in. -->
	<nav
		v-show="keyboardInset === 0"
		:aria-label="t('shell.navigation')"
		class="fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-line bg-canvas/92 pb-safe backdrop-blur-md"
	>
		<ul class="grid h-15 grid-cols-5">
			<template
				v-for="(item, i) in items"
				:key="item.label"
			>
				<li
					v-if="i === 2"
					class="grid place-items-center"
				>
					<button
						type="button"
						class="
							grid h-10 w-12 cursor-pointer place-items-center rounded-md bg-accent text-on-accent
							active:bg-accent-hover
						"
						:aria-label="t('shell.newTask')"
						@click="shell.quickAddOpen = true"
					>
						<UiIcon
							:icon="Plus"
							size="xl"
							:stroke="2.25"
						/>
					</button>
				</li>
				<li class="grid">
					<RouterLink
						v-if="item.to"
						:to="item.to"
						:aria-current="item.active ? 'page' : undefined"
						:class="itemClass"
					>
						<UiIcon
							:icon="item.icon"
							size="xl"
							:class="cn(item.active && 'text-accent')"
						/>
						{{ item.label }}
					</RouterLink>
					<button
						v-else
						type="button"
						:class="cn(itemClass, 'cursor-pointer')"
						@click="item.onClick?.()"
					>
						<UiIcon
							:icon="item.icon"
							size="xl"
						/>
						{{ item.label }}
					</button>
				</li>
			</template>
		</ul>
	</nav>
</template>
