<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {FileText, FileUp} from '@lucide/vue'

import {getHumanSize} from '@/helpers/getHumanSize'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

/** One file to import: picked with the button or, with a mouse, dropped on the box. */
const props = withDefaults(defineProps<{
	// Extensions, as the input's accept attribute takes them: ".csv,.txt"
	accept: string
	// Reading the picked file: the box shows it and takes no other.
	busy?: boolean
	busyLabel?: string
}>(), {
	busy: false,
	busyLabel: undefined,
})

const file = defineModel<File | null>({default: null})

const {t} = useI18n()
const {hasFinePointer} = useBreakpoints()
const input = useTemplateRef<HTMLInputElement>('input')
const dragging = ref(false)
let dragDepth = 0

const types = computed(() => props.accept.split(',').map(type => type.trim()).join(' · '))

function pick(files: FileList | null | undefined) {
	const picked = files?.[0]
	if (picked && !props.busy) {
		file.value = picked
	}
}

function onPicked(event: Event) {
	const target = event.target as HTMLInputElement
	pick(target.files)
	// Picking the same file again must fire change.
	target.value = ''
}

function onDragEnter(event: DragEvent) {
	if (!event.dataTransfer?.types.includes('Files')) {
		return
	}
	dragDepth++
	dragging.value = true
}

function onDragLeave() {
	dragDepth = Math.max(0, dragDepth - 1)
	dragging.value = dragDepth > 0
}

function onDrop(event: DragEvent) {
	dragDepth = 0
	dragging.value = false
	pick(event.dataTransfer?.files)
}
</script>

<template>
	<div
		:class="cn(
			'relative grid min-h-36 place-content-center justify-items-center gap-3 rounded-lg border border-dashed px-4 py-6',
			'text-center transition-colors',
			dragging ? 'border-accent bg-accent-subtle' : 'border-line-strong bg-canvas-subtle',
		)"
		:aria-busy="busy || undefined"
		@dragenter.prevent="onDragEnter"
		@dragover.prevent
		@dragleave="onDragLeave"
		@drop.prevent="onDrop"
	>
		<div
			v-if="file"
			class="
				flex w-full max-w-sm min-w-0 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5
				text-start
			"
		>
			<UiSpinner
				v-if="busy"
				class="size-5 text-accent"
				:label="busyLabel"
			/>
			<UiIcon
				v-else
				:icon="FileText"
				size="lg"
				class="text-ink-muted"
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">
					{{ file.name }}
				</p>
				<p class="font-mono text-2xs text-ink-faint">
					{{ busy && busyLabel ? busyLabel : getHumanSize(file.size) }}
				</p>
			</div>
			<UiButton
				v-if="!busy"
				variant="ghost"
				size="sm"
				class="-me-1 pointer-coarse:h-10"
				@click="input?.click()"
			>
				{{ t('migration.file.change') }}
			</UiButton>
		</div>
		<template v-else>
			<UiIcon
				:icon="FileUp"
				size="xl"
				class="text-ink-faint"
			/>
			<div class="grid justify-items-center gap-1.5">
				<UiButton @click="input?.click()">
					{{ t('migration.file.choose') }}
				</UiButton>
				<p
					v-if="hasFinePointer"
					class="text-xs text-ink-faint"
				>
					{{ t('migration.file.drop') }}
				</p>
			</div>
			<p class="font-mono text-2xs text-ink-faint">
				{{ types }}
			</p>
		</template>
		<div
			v-if="dragging"
			class="
				pointer-events-none absolute inset-2 grid place-content-center rounded-md border-2 border-dashed
				border-accent bg-surface/85 text-sm font-medium text-accent backdrop-blur-sm
			"
		>
			{{ t('migration.file.dropHere') }}
		</div>
		<input
			ref="input"
			type="file"
			:accept="accept"
			class="hidden"
			@change="onPicked"
		>
	</div>
</template>
