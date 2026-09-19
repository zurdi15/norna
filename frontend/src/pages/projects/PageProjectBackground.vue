<script setup lang="ts">
import {computed, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {ImageUp, Trash2} from '@lucide/vue'

import {
	useDeleteProjectBackgroundMutation,
	useSetUnsplashProjectBackgroundMutation,
	useUploadProjectBackgroundMutation,
} from '@/client/queries/projectBackgrounds'
import {PERMISSIONS} from '@/constants/permissions'
import {useTitle} from '@/composables/useTitle'
import BackgroundPreview from '@/features/projects/background/BackgroundPreview.vue'
import UnsplashSearch from '@/features/projects/background/UnsplashSearch.vue'
import {useBackgroundSettings} from '@/features/projects/background/useBackgroundSettings'
import ModalPage from '@/features/shell/ModalPage.vue'
import {useConfigStore} from '@/stores/config'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import {confirm} from '@/ui/confirm'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** The picture behind a project: uploaded, picked from Unsplash, or none. */
const props = withDefaults(defineProps<{
	projectId: number
	inModal?: boolean
}>(), {
	inModal: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const {hasFinePointer} = useBreakpoints()
useTitle(() => t('projectBackground.title'))

const uploadEnabled = computed(() => configStore.enabled_background_providers.includes('upload'))
const unsplashEnabled = computed(() => configStore.enabled_background_providers.includes('unsplash'))

const settings = useBackgroundSettings(() => props.projectId)
const {project, hasBackground, background, blurHashUrl, credit, unsplashId} = settings
const canWrite = computed(() => (project.value?.max_permission ?? 0) >= PERMISSIONS.READ_WRITE)

// A request still running after the user moved to another project stays quiet.
const isCurrent = (id: number) => id === props.projectId
const upload = useUploadProjectBackgroundMutation(isCurrent)
const setUnsplash = useSetUnsplashProjectBackgroundMutation(isCurrent)
const remove = useDeleteProjectBackgroundMutation(isCurrent)
const busy = computed(() => upload.isPending.value || setUnsplash.isPending.value || remove.isPending.value)
const pendingUnsplashId = computed(() => setUnsplash.isPending.value ? setUnsplash.variables.value?.imageId ?? null : null)

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

function send(file: File) {
	if (!busy.value) {
		upload.mutate({projectId: props.projectId, file})
	}
}

function onPicked(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (file) {
		send(file)
	}
	// Picking the same file again must fire change.
	input.value = ''
}

function pickUnsplash(imageId: string) {
	if (!busy.value && imageId !== unsplashId.value) {
		setUnsplash.mutate({projectId: props.projectId, imageId})
	}
}

async function removeBackground() {
	const projectId = props.projectId
	const confirmed = await confirm({
		title: t('projectBackground.removeTitle'),
		description: t('projectBackground.removeDescription'),
		confirmLabel: t('projectBackground.remove'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId})
	}
}
</script>

<template>
	<ModalPage
		:title="t('projectBackground.title')"
		:in-modal="inModal"
	>
		<UiEmptyState
			v-if="!uploadEnabled && !unsplashEnabled"
			:title="t('projectBackground.disabledTitle')"
			:description="t('projectBackground.disabledDescription')"
			class="py-8"
		/>
		<div
			v-else-if="settings.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-32 rounded-lg" />
			<UiSkeleton class="h-9 w-40" />
		</div>
		<div
			v-else
			class="grid gap-6"
		>
			<UiAlert
				v-if="!canWrite"
				tone="info"
			>
				{{ t('projectBackground.readOnly') }}
			</UiAlert>
			<div class="grid gap-3">
				<BackgroundPreview
					:src="background"
					:blur-hash-url="blurHashUrl"
					:credit="credit"
					:busy="busy"
					:droppable="canWrite && uploadEnabled"
					@drop="send"
				/>
				<div
					v-if="canWrite"
					class="flex flex-wrap items-center gap-2"
				>
					<template v-if="uploadEnabled">
						<UiButton
							:icon="ImageUp"
							:loading="upload.isPending.value"
							@click="fileInput?.click()"
						>
							{{ hasBackground ? t('projectBackground.replace') : t('projectBackground.upload') }}
						</UiButton>
						<input
							ref="fileInput"
							type="file"
							accept="image/*"
							class="hidden"
							@change="onPicked"
						>
					</template>
					<UiButton
						v-if="hasBackground"
						variant="ghost"
						:icon="Trash2"
						:loading="remove.isPending.value"
						class="hover:text-danger"
						@click="removeBackground"
					>
						{{ t('projectBackground.remove') }}
					</UiButton>
					<p
						v-if="uploadEnabled"
						class="basis-full text-xs text-ink-faint"
					>
						{{ t(hasFinePointer ? 'projectBackground.uploadHintDrop' : 'projectBackground.uploadHint', {size: configStore.max_file_size}) }}
					</p>
				</div>
			</div>
			<UnsplashSearch
				v-if="unsplashEnabled && canWrite"
				:current-id="unsplashId"
				:pending-id="pendingUnsplashId"
				@select="pickUnsplash"
			/>
		</div>
		<template
			v-if="inModal"
			#actions
		>
			<UiButton
				variant="secondary"
				@click="emit('close')"
			>
				{{ t('ui.close') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
