<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {X} from '@lucide/vue'

import {cn} from '@/ui/cn'
import {fieldBoxVariants} from '@/ui/field'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiKbd from '@/ui/UiKbd.vue'

import {acceleratorToShortcut, eventToAccelerator} from './accelerator'

/** Records a global shortcut: focus it, press the keys. Escape stops without changing it. */
defineProps<{
	id?: string
	describedBy?: string
}>()

const emit = defineEmits<{
	change: [accelerator: string]
}>()

const accelerator = defineModel<string>({default: ''})

const {t} = useI18n()
const recording = ref(false)

function set(value: string) {
	recording.value = false
	if (value !== accelerator.value) {
		accelerator.value = value
		emit('change', value)
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Tab' && !recording.value) {
		return
	}
	event.preventDefault()
	if (event.key === 'Escape') {
		recording.value = false
		return
	}
	recording.value = true
	const pressed = eventToAccelerator(event)
	if (pressed) {
		set(pressed)
	}
}
</script>

<template>
	<div class="flex items-center gap-1">
		<button
			:id="id"
			type="button"
			:aria-describedby="describedBy"
			:class="cn(
				fieldBoxVariants(),
				'min-w-0 flex-1 cursor-pointer text-start focus-visible:outline-none',
				recording && 'border-accent ring-3 ring-accent/20',
			)"
			@click="recording = true"
			@keydown="onKeydown"
			@blur="recording = false"
		>
			<span
				v-if="recording"
				class="text-accent"
			>{{ t('settingsAccount.general.shortcutRecording') }}</span>
			<UiKbd
				v-else-if="accelerator"
				:shortcut="acceleratorToShortcut(accelerator)"
			/>
			<span
				v-else
				class="text-ink-faint"
			>{{ t('settingsAccount.general.shortcutEmpty') }}</span>
		</button>
		<UiIconButton
			v-if="accelerator"
			:icon="X"
			:label="t('settingsAccount.general.shortcutClear')"
			@click="set('')"
		/>
	</div>
</template>
