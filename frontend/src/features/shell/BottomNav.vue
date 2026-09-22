<script setup lang="ts">
import {computed, onUnmounted, ref, watch, type Component} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {useActiveElement} from '@vueuse/core'
import {CalendarDays, FolderKanban, House, Plus, Search} from '@lucide/vue'

import {isFormField} from '@/helpers/shortcut'
import {useShellStore} from '@/stores/shell'
import {cn} from '@/ui/cn'
import {useKeyboardInset} from '@/ui/composables/useKeyboardInset'
import {usePageCovered} from '@/ui/composables/useLayerStack'
import UiIcon from '@/ui/UiIcon.vue'

const {t} = useI18n()
const route = useRoute()
const shell = useShellStore()
const keyboardInset = useKeyboardInset()
const covered = usePageCovered()
// Android doesn't report its keyboard to the visual viewport, so typing also hides the bar.
const activeElement = useActiveElement()
const typing = computed(() => isFormField(activeElement.value ?? null)
	|| (activeElement.value?.closest('[contenteditable="true"]') ?? null) !== null)

// How long the bar waits before coming back. An Android keyboard resizes the page as it
// slides away, and a bar fixed to the bottom rides that resize: it used to reappear
// halfway up the screen and then drop into place when a drawer with a text box closed.
const SETTLE_MS = 250

const hidden = computed(() => keyboardInset.value > 0 || typing.value)
const visible = ref(true)
let settle: ReturnType<typeof setTimeout> | undefined

watch(hidden, (isHidden, wasHidden) => {
	clearTimeout(settle)
	if (isHidden) {
		visible.value = false
		return
	}
	// Only coming back from hidden waits; the first render has nothing to wait for.
	if (wasHidden === undefined) {
		visible.value = true
		return
	}
	settle = setTimeout(() => visible.value = true, SETTLE_MS)
}, {immediate: true})
onUnmounted(() => clearTimeout(settle))

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
	<!-- Hidden while the keyboard is open: it would sit on top of the field being typed in. -->
	<nav
		v-show="visible"
		:aria-label="t('shell.navigation')"
		:class="cn(
			'fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-line pb-safe',
			// A drawer covers the bar anyway, and a blur under one flickers while it animates.
			covered ? 'bg-canvas' : 'bg-canvas/92 backdrop-blur-md',
		)"
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
