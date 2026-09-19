<script setup lang="ts">
import {computed, h} from 'vue'
import {Toaster} from 'vue-sonner'
import {CircleAlert, CircleCheck, Info, TriangleAlert, X} from '@lucide/vue'
import {useI18n} from 'vue-i18n'

import {useBreakpoints} from './composables/useBreakpoints'
import UiIcon from './UiIcon.vue'
import UiSpinner from './UiSpinner.vue'

const {t} = useI18n()
const {isMd} = useBreakpoints()

// On phones toasts drop from the top so they never cover the bottom navigation.
const position = computed(() => isMd.value ? 'bottom-right' : 'top-center')

const icon = (component: typeof CircleCheck, tone: string) => h(UiIcon, {icon: component, class: tone})

const icons = {
	success: icon(CircleCheck, 'text-success'),
	error: icon(CircleAlert, 'text-danger'),
	warning: icon(TriangleAlert, 'text-warning'),
	info: icon(Info, 'text-accent'),
	loading: h(UiSpinner),
	close: h(UiIcon, {icon: X, size: 'sm'}),
}

// Inverted surface (ink on canvas) so a toast reads as transient chrome on either theme.
const toastOptions = {
	unstyled: true,
	closeButtonAriaLabel: t('ui.close'),
	classes: {
		toast: 'flex w-(--width) items-center gap-3 rounded-lg bg-ink py-2.5 ps-3.5 pe-2.5 text-sm text-canvas shadow-overlay',
		content: 'min-w-0 flex-1',
		title: 'font-medium text-pretty',
		description: 'mt-0.5 text-xs text-canvas/70',
		icon: 'shrink-0',
		actionButton: 'shrink-0 cursor-pointer rounded-sm px-2 py-1 font-semibold text-canvas/85 hover:bg-canvas/10 hover:text-canvas',
		cancelButton: 'shrink-0 cursor-pointer rounded-sm px-2 py-1 text-canvas/70 hover:bg-canvas/10',
		closeButton: 'order-last grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-canvas/60 hover:bg-canvas/10 hover:text-canvas',
	},
}
</script>

<template>
	<Toaster
		:position="position"
		:icons="icons"
		:toast-options="toastOptions"
		:close-button="isMd"
		:visible-toasts="3"
		:offset="{bottom: 24, right: 24}"
		:mobile-offset="{top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 12, right: 12}"
		:container-aria-label="t('ui.notifications')"
	/>
</template>
