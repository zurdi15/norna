<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronsUpDown} from '@lucide/vue'

import {useProjects} from '@/composables/useProjects'
import TaskEditor from '@/features/editor/TaskEditor.vue'
import {toCssHex} from '@/helpers/color/toCssHex'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiColorSwatches from '@/ui/UiColorSwatches.vue'
import UiField from '@/ui/UiField.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'

import ParentProjectPicker from './ParentProjectPicker.vue'

export interface ProjectFormValue {
	title: string
	identifier: string
	hex_color: string
	parent_project_id: number
	description: string
}

/** The fields of a project, for creating one and for its settings. The page owns the submit button. */
withDefaults(defineProps<{
	// Set when editing, so the project can't be moved inside itself.
	projectId?: number
	formId: string
	// Only while creating: the description can be written later.
	showDescription?: boolean
}>(), {
	projectId: undefined,
	showDescription: true,
})

const emit = defineEmits<{
	submit: []
}>()

const model = defineModel<ProjectFormValue>({required: true})

const {t} = useI18n()
const projects = useProjects()

const touched = ref(false)
const titleError = computed(() => touched.value && model.value.title.trim() === '' ? t('projectSettings.titleRequired') : undefined)
const parentOpen = ref(false)
const parent = computed(() => projects.projects[model.value.parent_project_id])

const color = computed({
	get: () => toCssHex(model.value.hex_color) ?? '',
	set: hex => model.value = {...model.value, hex_color: hex},
})

function submit() {
	touched.value = true
	if (model.value.title.trim() !== '') {
		emit('submit')
	}
}

function setParent(id: number) {
	model.value = {...model.value, parent_project_id: id}
	parentOpen.value = false
}
</script>

<template>
	<form
		:id="formId"
		class="grid gap-5"
		novalidate
		@submit.prevent="submit"
	>
		<UiField
			:label="t('projectSettings.titleLabel')"
			:error="titleError"
			required
		>
			<UiInput
				v-model="model.title"
				data-autofocus
				autocomplete="off"
				@blur="touched = true"
			/>
		</UiField>
		<div class="grid gap-5 sm:grid-cols-2">
			<UiField :label="t('projectSettings.parent')">
				<UiAdaptivePopover
					v-model:open="parentOpen"
					:title="t('projectSettings.parent')"
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
						:model-value="model.parent_project_id"
						:project-id="projectId"
						@select="setParent"
					/>
				</UiAdaptivePopover>
			</UiField>
			<UiField
				:label="t('projectSettings.identifier')"
				:hint="t('projectSettings.identifierHint')"
			>
				<UiInput
					v-model="model.identifier"
					maxlength="10"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					class="font-mono uppercase"
				/>
			</UiField>
		</div>
		<UiField :label="t('projectSettings.color')">
			<UiColorSwatches
				v-model="color"
				:label="t('projectSettings.color')"
			/>
		</UiField>
		<UiField
			v-if="showDescription"
			:label="t('projectSettings.description')"
		>
			<div class="rounded-md border border-line-strong bg-surface px-3 py-2">
				<TaskEditor
					v-model="model.description"
					:placeholder="t('projectSettings.descriptionPlaceholder')"
					variant="description"
				/>
			</div>
		</UiField>
	</form>
</template>
