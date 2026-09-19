<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import {useProjects} from '@/composables/useProjects'
import ProjectPicker from '@/features/tasks/properties/ProjectPicker.vue'
import UiColorDot from '@/ui/UiColorDot.vue'

import PickerField from './PickerField.vue'

/** The project new tasks land in when none is picked. */
defineProps<{
	id?: string
	describedBy?: string
}>()

const emit = defineEmits<{
	select: [projectId: number]
}>()

const projectId = defineModel<number>({default: 0})

const {t} = useI18n()
const projects = useProjects()
const project = computed(() => projects.projects[projectId.value])

function pick(id: number, close: () => void) {
	close()
	if (id !== projectId.value) {
		projectId.value = id
		emit('select', id)
	}
}
</script>

<template>
	<PickerField
		:id="id"
		:described-by="describedBy"
		:title="t('settingsAccount.general.defaultProject')"
		:text="project?.title"
		:placeholder="t('settingsAccount.general.chooseProject')"
	>
		<template
			v-if="project"
			#leading
		>
			<UiColorDot :color="project.hex_color" />
		</template>
		<template #default="{close}">
			<ProjectPicker
				:model-value="projectId"
				@select="id => pick(id, close)"
			/>
		</template>
	</PickerField>
</template>
