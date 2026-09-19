<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus, X} from '@lucide/vue'

import type {ProjectViewDraft} from '@/client/queries/projectViews'
import FilterQueryField from '@/features/filters/FilterQueryField.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSegmented from '@/ui/UiSegmented.vue'

import {VIEW_ICONS, type ViewKind} from './viewKinds'

/**
 * A view's name, kind and filter. Boards also choose how their columns are made:
 * by hand, or one column per filter.
 */
defineProps<{
	formId: string
	projectId: number
	// The kind of a saved view can't change: its buckets or layout would be lost.
	kindLocked?: boolean
}>()

const emit = defineEmits<{
	submit: []
}>()

const model = defineModel<ProjectViewDraft>({required: true})

const {t} = useI18n()
const touched = ref(false)
const titleError = computed(() => touched.value && model.value.title.trim() === '' ? t('projectViews.titleRequired') : undefined)

const KINDS: ViewKind[] = ['list', 'kanban', 'table', 'gantt']
const kindItems = computed(() => KINDS.map(kind => ({value: kind, label: t(`projectView.kinds.${kind}`), icon: VIEW_ICONS[kind]})))

const filter = computed({
	get: () => model.value.filter?.filter ?? '',
	set: value => model.value = {...model.value, filter: {...model.value.filter, filter: value}},
})

const bucketModes = computed(() => [
	{value: 'manual' as const, label: t('projectViews.bucketsManual')},
	{value: 'filter' as const, label: t('projectViews.bucketsFilter')},
])

function setBucketFilter(index: number, value: string) {
	model.value = {
		...model.value,
		bucket_configuration: model.value.bucket_configuration.map((bucket, position) => position === index
			? {...bucket, filter: {...bucket.filter, filter: value}}
			: bucket),
	}
}

function setBucketTitle(index: number, title: string) {
	model.value = {
		...model.value,
		bucket_configuration: model.value.bucket_configuration.map((bucket, position) => position === index ? {...bucket, title} : bucket),
	}
}

function addBucket() {
	model.value = {
		...model.value,
		bucket_configuration: [...model.value.bucket_configuration, {title: '', filter: {filter: ''}}],
	}
}

function removeBucket(index: number) {
	model.value = {...model.value, bucket_configuration: model.value.bucket_configuration.filter((_, position) => position !== index)}
}

function submit() {
	touched.value = true
	if (model.value.title.trim() !== '') {
		emit('submit')
	}
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
			:label="t('projectViews.titleLabel')"
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
		<UiField
			v-if="!kindLocked"
			:label="t('projectViews.kind')"
		>
			<UiSegmented
				v-model="model.view_kind"
				:items="kindItems"
				:label="t('projectViews.kind')"
				class="justify-self-start"
			/>
		</UiField>
		<UiField
			:label="t('projectViews.filter')"
			:hint="t('projectViews.filterHint')"
		>
			<FilterQueryField
				v-model="filter"
				:label="t('projectViews.filter')"
				:project-id="projectId"
			/>
		</UiField>
		<template v-if="model.view_kind === 'kanban'">
			<UiField :label="t('projectViews.buckets')">
				<UiSegmented
					v-model="model.bucket_configuration_mode"
					:items="bucketModes"
					:label="t('projectViews.buckets')"
					class="justify-self-start"
				/>
			</UiField>
			<div
				v-if="model.bucket_configuration_mode === 'filter'"
				class="grid gap-3"
			>
				<p class="text-sm text-ink-muted">
					{{ t('projectViews.bucketsFilterHint') }}
				</p>
				<div
					v-for="(bucket, index) in model.bucket_configuration"
					:key="index"
					class="grid gap-2 rounded-md border border-line p-3"
				>
					<div class="flex items-center gap-2">
						<UiInput
							:model-value="bucket.title ?? ''"
							:aria-label="t('projectViews.bucketTitle')"
							:placeholder="t('projectViews.bucketTitle')"
							class="flex-1"
							@update:modelValue="value => setBucketTitle(index, String(value))"
						/>
						<UiIconButton
							:icon="X"
							:label="t('projectViews.removeBucket')"
							size="sm"
							@click="removeBucket(index)"
						/>
					</div>
					<FilterQueryField
						:model-value="bucket.filter?.filter ?? ''"
						:label="t('projectViews.bucketFilter')"
						:project-id="projectId"
						:show-done-switch="false"
						@update:modelValue="value => setBucketFilter(index, value)"
					/>
				</div>
				<UiButton
					variant="ghost"
					size="sm"
					:icon="Plus"
					class="justify-self-start"
					@click="addBucket"
				>
					{{ t('projectViews.addBucket') }}
				</UiButton>
			</div>
		</template>
	</form>
</template>
