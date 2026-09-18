<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'

import {SHORTCUTS} from '@/constants/shortcuts'
import {useShellStore} from '@/stores/shell'
import UiDialog from '@/ui/UiDialog.vue'
import UiKbd from '@/ui/UiKbd.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

import {KEYBOARD_SHORTCUTS, type Shortcut} from './shortcuts'

const {t} = useI18n()
const route = useRoute()
const shell = useShellStore()

const groups = computed(() => KEYBOARD_SHORTCUTS.filter(group => group.available?.(route) ?? true))

// "then" sequences are one keycap per step; chords are one step.
function steps(shortcut: Shortcut): string[][] {
	return shortcut.combination === 'then' ? shortcut.keys.map(key => [key]) : [shortcut.keys]
}
</script>

<template>
	<!-- Hidden trigger so "?" opens the dialog from anywhere. -->
	<button
		v-shortcut="SHORTCUTS.showKeyboardShortcuts"
		type="button"
		class="sr-only"
		tabindex="-1"
		@click="shell.shortcutsOpen = true"
	>
		{{ t('shell.shortcuts.title') }}
	</button>
	<UiDialog
		v-model:open="shell.shortcutsOpen"
		:title="t('shell.shortcuts.title')"
		size="lg"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<section
				v-for="group in groups"
				:key="group.title"
				class="grid content-start gap-1"
			>
				<UiSectionHeading
					:title="t(group.title)"
					as="h3"
				/>
				<dl class="grid">
					<div
						v-for="shortcut in group.shortcuts"
						:key="shortcut.title"
						class="flex items-center justify-between gap-4 py-1.5"
					>
						<dt class="text-sm text-ink-muted">
							{{ t(shortcut.title) }}
						</dt>
						<dd>
							<UiKbd :steps="steps(shortcut)" />
						</dd>
					</div>
				</dl>
			</section>
		</div>
	</UiDialog>
</template>
