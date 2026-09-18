<script setup lang="ts">
import {computed, onMounted, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {onKeyStroke, useEventListener} from '@vueuse/core'

import {ensureLabels} from '@/client/queries/labels'
import {ensureProjects} from '@/client/queries/projects'
import {useProjects} from '@/composables/useProjects'
import QuickAddComposer from '@/features/tasks/quick-add/QuickAddComposer.vue'
import {useAuthStore} from '@/stores/auth'
import UiButton from '@/ui/UiButton.vue'

import {useQuickEntryWindow} from './useQuickEntryWindow'

/**
 * The desktop app's quick entry (`?mode=quick-add`): a floating composer summoned by a
 * global shortcut. Enter creates the task and hides the window; Escape hides it.
 */
const {t} = useI18n()
const authStore = useAuthStore()
const projects = useProjects()

const card = useTemplateRef<HTMLElement>('card')
const composer = useTemplateRef<InstanceType<typeof QuickAddComposer>>('composer')
const quickEntry = useQuickEntryWindow(card)

const defaultProjectId = computed(() => {
	const preferred = authStore.settings.default_project_id
	return preferred > 0 && projects.projects[preferred]
		? preferred
		: projects.notArchivedRootProjects[0]?.id ?? 0
})

onMounted(() => {
	void ensureProjects()
	void ensureLabels()
	composer.value?.focus()
})

// Whatever is open inside (a picker) closes first; then the window.
onKeyStroke('Escape', event => {
	if (!event.defaultPrevented && !document.querySelector('[data-reka-popper-content-wrapper], [role="dialog"]')) {
		quickEntry.close()
	}
})

// The window is hidden, not closed: the next summon starts with the cursor in the field.
useEventListener(document, 'visibilitychange', () => {
	if (document.visibilityState === 'visible') {
		composer.value?.focus()
	}
})
</script>

<template>
	<div
		ref="card"
		class="overflow-hidden rounded-lg border border-line-strong bg-surface-raised shadow-overlay"
	>
		<QuickAddComposer
			v-if="authStore.authUser"
			ref="composer"
			:default-project-id="defaultProjectId"
			@created="quickEntry.close()"
		/>
		<div
			v-else
			class="flex items-center gap-3 px-4 py-3"
		>
			<p class="min-w-0 flex-1 text-sm text-ink-muted">
				{{ t('quickEntry.signedOut') }}
			</p>
			<UiButton
				variant="secondary"
				size="sm"
				@click="quickEntry.showMainWindow()"
			>
				{{ t('quickEntry.openNorna') }}
			</UiButton>
		</div>
	</div>
</template>
