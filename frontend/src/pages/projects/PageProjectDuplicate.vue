<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {ChevronsUpDown} from '@lucide/vue'

import {useDuplicateProjectMutation} from '@/client/queries/projects'
import {useProject} from '@/composables/useProject'
import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import ParentProjectPicker from '@/features/projects/ParentProjectPicker.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

/** Copies a project with its tasks and views, next to the original unless another parent is picked. */
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
const router = useRouter()
const projects = useProjects()
const {project, isLoaded} = useProject(() => props.projectId)
const duplicate = useDuplicateProjectMutation()
useTitle(() => t('projectSettings.duplicateTitle'))

const parentId = ref(0)
watch(isLoaded, loaded => {
	if (loaded) {
		parentId.value = project.value.parent_project_id
	}
}, {immediate: true})
const parent = computed(() => projects.projects[parentId.value])
const parentOpen = ref(false)
const withShares = ref(false)

function cancel() {
	if (props.inModal) {
		emit('close')
	} else {
		router.back()
	}
}

async function submit() {
	try {
		const copy = await duplicate.mutateAsync({
			projectId: props.projectId,
			parentProjectId: parentId.value,
			duplicateShares: withShares.value,
		})
		await router.replace({name: 'project.index', params: {projectId: copy.id}})
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<ModalPage
		:title="t('projectSettings.duplicateTitle')"
		:in-modal="inModal"
	>
		<p class="text-base text-pretty text-ink-muted">
			{{ t('projectSettings.duplicateDescription', {project: project.title}) }}
		</p>
		<UiField :label="t('projectSettings.duplicateParent')">
			<UiAdaptivePopover
				v-model:open="parentOpen"
				:title="t('projectSettings.duplicateParent')"
			>
				<template #trigger>
					<button
						type="button"
						class="
							flex h-8.5 w-full cursor-pointer items-center gap-2 rounded-md border border-line-strong
							bg-surface px-3 text-start text-base
							focus-visible:border-accent focus-visible:outline-none
							pointer-coarse:h-11 pointer-coarse:text-lg
						"
					>
						<UiColorDot
							v-if="parent"
							:color="parent.hex_color"
						/>
						<span
							class="min-w-0 flex-1 truncate"
							:class="!parent && 'text-ink-faint'"
						>{{ parent?.title ?? t('projectSettings.noParent') }}</span>
						<UiIcon
							:icon="ChevronsUpDown"
							size="sm"
							class="text-ink-faint"
						/>
					</button>
				</template>
				<ParentProjectPicker
					:model-value="parentId"
					@select="id => { parentId = id; parentOpen = false }"
				/>
			</UiAdaptivePopover>
		</UiField>
		<label class="flex cursor-pointer items-center justify-between gap-4 text-base">
			{{ t('projectSettings.duplicateShares') }}
			<UiSwitch v-model="withShares" />
		</label>
		<template #actions>
			<UiButton
				variant="ghost"
				@click="cancel"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				:disabled="!isLoaded"
				:loading="duplicate.isPending.value"
				@click="submit"
			>
				{{ t('projectSettings.duplicate') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
