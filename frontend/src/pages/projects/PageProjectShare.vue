<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {PERMISSIONS} from '@/constants/permissions'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ShareLinks from '@/features/sharing/ShareLinks.vue'
import ShareTeams from '@/features/sharing/ShareTeams.vue'
import ShareUsers from '@/features/sharing/ShareUsers.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import {useConfigStore} from '@/stores/config'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Who can open a project: people, teams and, when the server allows it, public links. */
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
const {project, isLoaded} = useProject(() => props.projectId)
const title = computed(() => isLoaded.value ? t('projectShare.titleNamed', {project: project.value.title}) : t('projectShare.title'))
useTitle(title)

// Only admins can change the shares; the server refuses everyone else.
const canManage = computed(() => project.value.max_permission === PERMISSIONS.ADMIN)
</script>

<template>
	<ModalPage
		:title="title"
		:in-modal="inModal"
	>
		<div
			v-if="!isLoaded"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-6 w-32" />
			<UiSkeleton class="h-10" />
			<UiSkeleton class="h-10" />
		</div>
		<div
			v-else
			class="grid gap-7"
		>
			<UiAlert
				v-if="!canManage"
				tone="info"
			>
				{{ t('projectShare.readOnly') }}
			</UiAlert>
			<ShareUsers
				:project-id="projectId"
				:project-title="project.title"
				:owner="project.owner"
				:can-manage="canManage"
			/>
			<ShareTeams
				:project-id="projectId"
				:project-title="project.title"
				:can-manage="canManage"
			/>
			<ShareLinks
				v-if="configStore.link_sharing_enabled && canManage"
				:project-id="projectId"
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
