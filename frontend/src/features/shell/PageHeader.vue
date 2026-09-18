<script setup lang="ts">
import type {RouteLocationRaw} from 'vue-router'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {ChevronLeft, Menu} from '@lucide/vue'

import {useShellStore} from '@/stores/shell'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiIconButton from '@/ui/UiIconButton.vue'

/**
 * The sticky top of every page: back or menu button, title, actions.
 * `large` gives phones the big title below the bar used on the root screens.
 */
const props = withDefaults(defineProps<{
	title: string
	// Mono label above the title, e.g. "Proyectos / Casa".
	caption?: string
	// true goes back in history (or home when there is none); a route goes there.
	back?: boolean | RouteLocationRaw
	large?: boolean
}>(), {
	caption: undefined,
	back: false,
	large: false,
})

const {t} = useI18n()
const router = useRouter()
const shell = useShellStore()
const {isMd, isLg} = useBreakpoints()

function goBack() {
	if (typeof props.back === 'object') {
		router.push(props.back)
	} else if (window.history.state?.back) {
		router.back()
	} else {
		router.push({name: 'home'})
	}
}
</script>

<template>
	<header class="sticky top-0 z-(--z-sticky) border-b border-line bg-canvas/90 pt-safe backdrop-blur-md">
		<div class="flex h-13 items-center gap-1 px-2 md:h-14 md:px-4 lg:px-6">
			<UiIconButton
				v-if="isMd && !isLg"
				:icon="Menu"
				:label="t('shell.openNavigation')"
				@click="shell.drawerOpen = true"
			/>
			<UiIconButton
				v-if="back"
				:icon="ChevronLeft"
				:label="t('shell.back')"
				class="-ms-1"
				@click="goBack"
			/>
			<slot name="leading" />
			<div class="min-w-0 flex-1 px-1">
				<p
					v-if="caption"
					class="truncate caption"
				>
					{{ caption }}
				</p>
				<h1
					v-if="!large || isMd"
					class="truncate text-lg font-semibold tracking-tight md:text-xl"
				>
					<slot name="title">
						{{ title }}
					</slot>
				</h1>
			</div>
			<div class="flex shrink-0 items-center gap-0.5">
				<slot name="actions" />
			</div>
		</div>
		<div
			v-if="large && !isMd"
			class="px-4 pb-3"
		>
			<h1 class="text-3xl font-semibold tracking-tight text-balance">
				<slot name="title">
					{{ title }}
				</slot>
			</h1>
			<slot name="subtitle" />
		</div>
		<slot name="below" />
	</header>
</template>
