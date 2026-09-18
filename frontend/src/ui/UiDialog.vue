<script setup lang="ts">
import {computed, ref, watch, type HTMLAttributes} from 'vue'
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
	DialogTitle,
	DialogTrigger,
} from 'reka-ui'
import {useI18n} from 'vue-i18n'
import {X} from '@lucide/vue'

import {cn} from './cn'
import {useBreakpoints} from './composables/useBreakpoints'
import {useKeyboardInset} from './composables/useKeyboardInset'
import {useSwipeDismiss} from './composables/useSwipeDismiss'
import UiIconButton from './UiIconButton.vue'

const props = withDefaults(defineProps<{
	// Always required: it names the dialog for assistive tech even when hidden.
	title: string
	description?: string
	hideTitle?: boolean
	// auto: centered panel from md up, bottom sheet below.
	presentation?: 'auto' | 'sheet' | 'center'
	size?: 'sm' | 'md' | 'lg'
	class?: HTMLAttributes['class']
	bodyClass?: HTMLAttributes['class']
}>(), {
	description: undefined,
	hideTitle: false,
	presentation: 'auto',
	size: 'md',
	class: undefined,
	bodyClass: undefined,
})

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const {isMd} = useBreakpoints()
const keyboardInset = useKeyboardInset()

const asSheet = computed(() => props.presentation === 'sheet' || (props.presentation === 'auto' && !isMd.value))

const handle = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const sheet = computed(() => scroller.value?.parentElement ?? null)

const swipe = useSwipeDismiss({
	sheet,
	handle,
	scroller,
	enabled: asSheet,
	onDismiss: () => open.value = false,
})

watch(open, isOpen => isOpen && swipe.reset())

const sheetStyle = computed(() => asSheet.value
	? {...swipe.style.value, bottom: `${keyboardInset.value}px`}
	: undefined)

const SIZES = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
} as const

// Reka merges $attrs after its own aria-describedby: overriding it with undefined (only when
// there is no description) drops the dangling reference and its console warning.
const NO_DESCRIPTION = {'aria-describedby': undefined}

function close() {
	open.value = false
}
</script>

<template>
	<DialogRoot v-model:open="open">
		<DialogTrigger
			v-if="$slots.trigger"
			as-child
		>
			<slot name="trigger" />
		</DialogTrigger>
		<DialogPortal>
			<DialogOverlay
				class="
					fixed inset-0 z-(--z-overlay) bg-scrim
					data-[state=closed]:animate-fade-out
					data-[state=open]:animate-fade-in
				"
			/>
			<DialogContent
				v-bind="description ? {} : NO_DESCRIPTION"
				:style="sheetStyle"
				:class="cn(
					'fixed z-(--z-modal) flex flex-col border-line bg-surface-raised shadow-overlay focus:outline-none',
					asSheet
						? `
							inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet border-t pb-safe
							data-[state=closed]:animate-sheet-out
							data-[state=open]:animate-sheet-in
						`
						: [
							'top-1/2 left-1/2 max-h-[85dvh] w-[calc(100vw-2rem)] -translate-1/2 rounded-lg border',
							'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
							SIZES[size],
						],
					props.class,
				)"
			>
				<div
					ref="handle"
					:class="asSheet && 'touch-none select-none'"
				>
					<div
						v-if="asSheet"
						class="mx-auto mt-2 mb-1 h-1 w-9 rounded-full bg-line-strong"
						aria-hidden="true"
					/>
					<header
						:class="cn(
							'flex items-start gap-3 px-5 pt-3 pb-2',
							!asSheet && 'pt-5',
							hideTitle && 'sr-only',
						)"
					>
						<div class="min-w-0 flex-1">
							<DialogTitle class="text-lg font-semibold text-balance">
								{{ title }}
							</DialogTitle>
							<DialogDescription
								v-if="description"
								class="mt-1 text-sm text-ink-muted"
							>
								{{ description }}
							</DialogDescription>
						</div>
						<DialogClose
							v-if="!asSheet"
							as-child
						>
							<UiIconButton
								:icon="X"
								:label="t('ui.close')"
								:tooltip="false"
								size="sm"
								class="-me-2 -mt-1"
							/>
						</DialogClose>
					</header>
				</div>
				<div
					ref="scroller"
					:class="cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5', props.bodyClass)"
				>
					<slot :close="close" />
				</div>
				<footer
					v-if="$slots.footer"
					class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3"
				>
					<slot
						name="footer"
						:close="close"
					/>
				</footer>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
