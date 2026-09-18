<script setup lang="ts">
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {CircleCheck} from '@lucide/vue'

import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'

import CopyableValue from './CopyableValue.vue'

/**
 * A token just created, shown this once: the server never hands it out again.
 * "Done" forgets it; so does leaving the page.
 */
withDefaults(defineProps<{
	title: string
	value: string
	label?: string
}>(), {
	label: undefined,
})

const emit = defineEmits<{
	done: []
}>()

const {t} = useI18n()
const panel = useTemplateRef<HTMLElement>('panel')

// How long a dialog closing behind it may take to hand the focus back to its trigger.
const RECLAIM_FOCUS_MS = 600

function focusPanel() {
	panel.value?.focus({preventScroll: true})
}

// The dialog that created the token returns the focus to its trigger as it closes: take it back once.
function reclaim(event: FocusEvent) {
	if (!panel.value?.contains(event.target as Node)) {
		focusPanel()
	}
}
let reclaimTimer: ReturnType<typeof setTimeout> | undefined

function stopReclaiming() {
	clearTimeout(reclaimTimer)
	document.removeEventListener('focusin', reclaim)
}

// Takes the focus so it is read out, and scrolls into view on a long page.
onMounted(() => {
	focusPanel()
	panel.value?.scrollIntoView({block: 'nearest', behavior: 'smooth'})
	document.addEventListener('focusin', reclaim, {once: true})
	reclaimTimer = setTimeout(stopReclaiming, RECLAIM_FOCUS_MS)
})
onBeforeUnmount(stopReclaiming)
</script>

<template>
	<section
		ref="panel"
		tabindex="-1"
		class="grid scroll-mt-20 gap-3 rounded-lg border border-success/35 bg-success-subtle p-4 focus:outline-none"
		:aria-label="title"
	>
		<div class="flex items-start gap-2.5">
			<UiIcon
				:icon="CircleCheck"
				class="mt-0.5 text-success"
			/>
			<div class="min-w-0 flex-1">
				<p class="text-base font-semibold text-ink pointer-coarse:text-md">
					{{ title }}
				</p>
				<p class="mt-0.5 text-sm text-pretty text-ink-muted">
					{{ t('settingsIntegrations.secret.onlyOnce') }}
				</p>
			</div>
		</div>
		<CopyableValue
			:value="value"
			:label="label ?? t('settingsIntegrations.secret.token')"
			hide-label
		/>
		<slot />
		<div class="flex justify-end">
			<UiButton @click="emit('done')">
				{{ t('settingsIntegrations.secret.done') }}
			</UiButton>
		</div>
	</section>
</template>
