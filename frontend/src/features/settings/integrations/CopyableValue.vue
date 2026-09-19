<script setup lang="ts">
import {useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {Check, Copy} from '@lucide/vue'

import {useCopyFeedback} from '@/composables/useCopyToClipboard'
import {cn} from '@/ui/cn'
import UiIconButton from '@/ui/UiIconButton.vue'

/**
 * A value to paste somewhere else (a url, a token, a command) in mono, with a copy
 * button that turns into a check for a moment instead of toasting.
 */
const props = withDefaults(defineProps<{
	value: string
	// Names the value: the caption above it, and what the copy button copies.
	label: string
	hideLabel?: boolean
	// Commands and config files keep their lines, scrolling sideways when long.
	code?: boolean
}>(), {
	hideLabel: false,
	code: false,
})

const {t} = useI18n()
const labelId = useId()
const {copied, copy: copyText} = useCopyFeedback()

function copy() {
	void copyText(props.value)
}
</script>

<template>
	<div class="grid min-w-0 gap-1.5">
		<p
			:id="labelId"
			:class="hideLabel ? 'sr-only' : 'text-sm font-medium text-ink'"
		>
			{{ label }}
		</p>
		<div class="flex min-w-0 items-start gap-1 rounded-md border border-line bg-canvas-subtle py-0.5 ps-3 pe-0.5">
			<!-- Selectable in one tap, for when the clipboard isn't available. -->
			<code
				:class="cn(
					'min-w-0 flex-1 py-1.5 font-mono text-sm text-ink select-all pointer-coarse:py-2.5',
					code ? 'overflow-x-auto whitespace-pre' : 'break-all',
				)"
			>{{ value }}</code>
			<UiIconButton
				:icon="copied ? Check : Copy"
				:label="copied ? t('settingsIntegrations.copied') : t('settingsIntegrations.copy')"
				:aria-describedby="labelId"
				:class="copied && 'text-success hover:text-success'"
				@click="copy"
			/>
		</div>
		<span
			class="sr-only"
			aria-live="polite"
		>{{ copied ? t('settingsIntegrations.copied') : '' }}</span>
	</div>
</template>
