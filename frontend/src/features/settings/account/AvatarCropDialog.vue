<script setup lang="ts">
import {onBeforeUnmount, ref, shallowRef, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {Cropper, Preview, type CropperResult} from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'

/**
 * Crops a picked image to a square before it becomes the avatar, with a round preview
 * of how it will look next to the name.
 */
const props = withDefaults(defineProps<{
	file: File | null
	saving?: boolean
}>(), {
	saving: false,
})

const emit = defineEmits<{
	save: [image: Blob]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const cropper = useTemplateRef<InstanceType<typeof Cropper>>('cropper')

// The server resizes avatars anyway; this keeps a phone photo far below the upload limit.
const MAX_SIZE = 512

const source = ref<string>()
const result = shallowRef<Pick<CropperResult, 'coordinates' | 'image'>>()
const ready = ref(false)

function release() {
	if (source.value) {
		URL.revokeObjectURL(source.value)
	}
	source.value = undefined
	result.value = undefined
	ready.value = false
}

watch(() => props.file, file => {
	release()
	if (file) {
		source.value = URL.createObjectURL(file)
	}
}, {immediate: true})
onBeforeUnmount(release)

function onChange({coordinates, image}: CropperResult) {
	result.value = {coordinates, image}
}

async function save() {
	const canvas = cropper.value?.getResult().canvas
	if (!canvas) {
		return
	}
	const image = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
	if (image) {
		emit('save', image)
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('settingsAccount.avatar.cropTitle')"
		:description="t('settingsAccount.avatar.cropDescription')"
	>
		<div class="grid gap-4">
			<Cropper
				v-if="source"
				ref="cropper"
				:src="source"
				:stencil-props="{aspectRatio: 1}"
				:canvas="{maxWidth: MAX_SIZE, maxHeight: MAX_SIZE}"
				class="h-72 overflow-hidden rounded-md bg-canvas-subtle md:h-80"
				@ready="ready = true"
				@change="onChange"
			/>
			<div
				v-if="result"
				class="flex items-center gap-3"
			>
				<Preview
					:image="result.image"
					:coordinates="result.coordinates"
					:width="48"
					:height="48"
					class="shrink-0 overflow-hidden rounded-full"
				/>
				<p class="text-sm text-ink-muted">
					{{ t('settingsAccount.avatar.cropPreview') }}
				</p>
			</div>
		</div>
		<template #footer>
			<UiButton
				variant="ghost"
				@click="open = false"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				:disabled="!ready"
				:loading="saving"
				@click="save"
			>
				{{ t('settingsAccount.avatar.usePicture') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
