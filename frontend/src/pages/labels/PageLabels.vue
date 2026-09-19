<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {Plus, Tags, Trash2} from '@lucide/vue'

import type {Label} from '@/client/generated'
import {sortLabelsAlphabetically, useDeleteLabelMutation, useUpdateLabelMutation} from '@/client/queries/labels'
import {useLabels} from '@/composables/useLabels'
import {useTitle} from '@/composables/useTitle'
import LabelForm, {type LabelFormValue} from '@/features/labels/LabelForm.vue'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBackdropLink} from '@/features/shell/useRouteBackdrop'
import {toCssHex} from '@/helpers/color/toCssHex'
import {error} from '@/message'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

defineOptions({inheritAttrs: false})

/**
 * Every label the user can use. Their own ones open for editing; labels they see
 * through shared projects belong to someone else and only show.
 */
const {t} = useI18n()
useTitle(() => t('labels.title'))

const authStore = useAuthStore()
const {labels, isPending} = useLabels()
const update = useUpdateLabelMutation()
const remove = useDeleteLabelMutation()
const backdropLink = useBackdropLink()

const sorted = computed(() => sortLabelsAlphabetically(labels.value))
const isOwn = (label: Label) => label.created_by?.id === authStore.info?.id

const editing = ref<Label | null>(null)
const draft = ref<LabelFormValue>({title: '', hex_color: '', description: ''})
const dialogOpen = computed({
	get: () => editing.value !== null,
	set: open => {
		if (!open) {
			editing.value = null
		}
	},
})

function edit(label: Label) {
	editing.value = label
	draft.value = {title: label.title ?? '', hex_color: toCssHex(label.hex_color) ?? '', description: label.description ?? ''}
}

async function save() {
	const label = editing.value
	if (!label?.id) {
		return
	}
	try {
		await update.mutateAsync({id: label.id, ...draft.value, title: draft.value.title.trim()})
		editing.value = null
	} catch (cause) {
		error(cause)
	}
}

async function deleteLabel() {
	const label = editing.value
	if (!label) {
		return
	}
	const confirmed = await confirm({
		title: t('labels.deleteTitle'),
		description: t('labels.deleteDescription', {label: label.title}),
		confirmLabel: t('labels.delete'),
		tone: 'danger',
	})
	if (!confirmed) {
		return
	}
	editing.value = null
	try {
		await remove.mutateAsync(label)
	} catch (cause) {
		error(cause)
	}
}
</script>

<template>
	<PageHeader
		:title="t('labels.title')"
		large
	>
		<template #actions>
			<UiButton
				variant="primary"
				size="sm"
				:icon="Plus"
				:as="RouterLink"
				:to="backdropLink({name: 'labels.create'})"
			>
				{{ t('labels.new') }}
			</UiButton>
			<MobileRootActions />
		</template>
	</PageHeader>

	<div class="@container mx-auto max-w-3xl pb-10">
		<div
			v-if="isPending"
			class="grid gap-3 p-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 5"
				:key="index"
				class="h-6 w-1/3"
			/>
		</div>
		<UiEmptyState
			v-else-if="!sorted.length"
			:title="t('labels.emptyTitle')"
			:description="t('labels.emptyDescription')"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="Tags"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<ul
			v-else
			role="list"
			class="pt-2"
		>
			<li
				v-for="label in sorted"
				:key="label.id"
			>
				<component
					:is="isOwn(label) ? 'button' : 'div'"
					:type="isOwn(label) ? 'button' : undefined"
					class="
						flex min-h-11 w-full items-center gap-3 px-4 text-start
						focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent
						enabled:cursor-pointer
						enabled:hover:bg-canvas-subtle
						@xl:px-6
						pointer-coarse:min-h-13
					"
					@click="isOwn(label) && edit(label)"
				>
					<UiColorDot
						:color="label.hex_color"
						class="size-2.5"
					/>
					<span class="min-w-0 truncate text-base pointer-coarse:text-md">{{ label.title }}</span>
					<span
						v-if="label.description"
						class="min-w-0 flex-1 truncate text-sm text-ink-faint"
					>{{ label.description }}</span>
					<span
						v-else
						class="flex-1"
					/>
					<span
						v-if="!isOwn(label)"
						class="shrink-0 font-mono text-2xs text-ink-faint"
					>{{ t('labels.shared') }}</span>
				</component>
			</li>
		</ul>
	</div>

	<UiDialog
		v-model:open="dialogOpen"
		:title="t('labels.editTitle')"
		size="sm"
	>
		<LabelForm
			v-model="draft"
			form-id="label-edit"
			@submit="save"
		/>
		<template #footer>
			<UiButton
				variant="ghost"
				:icon="Trash2"
				class="me-auto text-danger"
				@click="deleteLabel"
			>
				{{ t('labels.delete') }}
			</UiButton>
			<UiButton
				variant="ghost"
				@click="editing = null"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				form="label-edit"
				variant="primary"
				:loading="update.isPending.value"
			>
				{{ t('projectSettings.save') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
