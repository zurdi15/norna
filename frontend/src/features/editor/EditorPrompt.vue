<script setup lang="ts">
import {ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {ArrowUpRight, Unlink} from '@lucide/vue'

import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

/**
 * A one-field form for the link url or the image alt text: a popover under the selection
 * from md up, a bottom sheet below. On close, the overlay hands the focus back to its
 * trigger, an invisible anchor that passes it on to the editor.
 */
const props = withDefaults(defineProps<{
	title: string
	label: string
	initialValue: string
	// Where the popover points at, relative to the editor.
	anchor: {top: number, left: number, height: number}
	type?: 'url' | 'text'
	placeholder?: string
	// Shows "Open" and "Remove link" for an existing link.
	href?: string
}>(), {
	type: 'text',
	placeholder: undefined,
	href: undefined,
})

const emit = defineEmits<{
	submit: [value: string]
	remove: []
	returnFocus: []
}>()

const open = defineModel<boolean>('open', {default: false})

defineOptions({inheritAttrs: false})

const {t} = useI18n()

const value = ref('')
watch(open, isOpen => {
	if (isOpen) {
		value.value = props.initialValue
	}
}, {immediate: true})

function submit() {
	emit('submit', value.value.trim())
	open.value = false
}

function remove() {
	emit('remove')
	open.value = false
}
</script>

<template>
	<UiAdaptivePopover
		v-model:open="open"
		:title="title"
		class="w-80"
	>
		<template #trigger>
			<span
				tabindex="-1"
				class="pointer-events-none absolute w-px"
				:style="{top: `${anchor.top}px`, left: `${anchor.left}px`, height: `${anchor.height}px`}"
				@focus="emit('returnFocus')"
			/>
		</template>
		<!-- novalidate: a bare "example.com" is fine, the editor adds the scheme itself. -->
		<form
			class="grid gap-3 px-5 pt-1 pb-3 md:p-3"
			novalidate
			@submit.prevent="submit"
		>
			<UiField :label="label">
				<UiInput
					v-model="value"
					:type="type"
					:inputmode="type === 'url' ? 'url' : undefined"
					:placeholder="placeholder"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="done"
					data-autofocus
				/>
			</UiField>
			<div class="flex flex-wrap items-center gap-2">
				<template v-if="href">
					<UiButton
						as="a"
						:href="href"
						target="_blank"
						rel="noopener noreferrer nofollow"
						variant="ghost"
						:icon="ArrowUpRight"
					>
						{{ t('editor.link.open') }}
					</UiButton>
					<UiButton
						variant="ghost"
						:icon="Unlink"
						@click="remove"
					>
						{{ t('editor.link.remove') }}
					</UiButton>
				</template>
				<UiButton
					type="submit"
					variant="primary"
					class="ms-auto"
				>
					{{ t('editor.apply') }}
				</UiButton>
			</div>
		</form>
	</UiAdaptivePopover>
</template>
