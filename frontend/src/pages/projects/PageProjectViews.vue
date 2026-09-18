<script setup lang="ts">
import {computed, ref, shallowRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {VueDraggable} from 'vue-draggable-plus'
import {GripVertical, Pencil, Plus, Trash2} from '@lucide/vue'

import type {ProjectView} from '@/client/generated'
import {
	createProjectViewDraft,
	createProjectViewUpdate,
	sortProjectViewsByPosition,
	useCreateProjectViewMutation,
	useDeleteProjectViewMutation,
	useUpdateProjectViewMutation,
	type ProjectViewDraft,
} from '@/client/queries/projectViews'
import {useProject} from '@/composables/useProject'
import {useTitle} from '@/composables/useTitle'
import ViewForm from '@/features/project-views/ViewForm.vue'
import {VIEW_ICONS, viewTitle} from '@/features/project-views/viewKinds'
import ModalPage from '@/features/shell/ModalPage.vue'
import {calculateItemPosition} from '@/helpers/calculateItemPosition'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

/** The views of a project: their order, how each filters, and new ones. */
const props = withDefaults(defineProps<{
	projectId: number
	inModal?: boolean
}>(), {
	inModal: false,
})

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const {project} = useProject(() => props.projectId)
const create = useCreateProjectViewMutation()
const update = useUpdateProjectViewMutation()
const remove = useDeleteProjectViewMutation()
useTitle(() => t('projectViews.title'))

// A copy the drag can reorder in place.
const views = shallowRef<ProjectView[]>([])
watch(() => project.value.views, current => {
	views.value = sortProjectViewsByPosition([...(current ?? [])])
}, {immediate: true})

const editingId = ref<number | 'new' | null>(null)
const draft = ref<ProjectViewDraft>(createProjectViewDraft())

function startEdit(view: ProjectView) {
	editingId.value = view.id ?? null
	draft.value = createProjectViewDraft(view)
}

function startCreate() {
	editingId.value = 'new'
	const last = views.value.at(-1)
	draft.value = createProjectViewDraft({title: '', view_kind: 'list', position: calculateItemPosition(last?.position ?? null, null)})
}

async function save() {
	try {
		if (editingId.value === 'new') {
			await create.mutateAsync({projectId: props.projectId, view: {...draft.value, title: draft.value.title.trim()}})
		} else if (editingId.value !== null) {
			await update.mutateAsync({
				projectId: props.projectId,
				viewId: editingId.value,
				view: createProjectViewUpdate({...draft.value, title: draft.value.title.trim()}),
			})
		}
		editingId.value = null
	} catch {
		// Reported by the mutation.
	}
}

function onDrop(event: {oldIndex?: number, newIndex?: number}) {
	const index = event.newIndex
	if (index === undefined || index === event.oldIndex) {
		return
	}
	const moved = views.value[index]
	if (!moved?.id) {
		return
	}
	const position = calculateItemPosition(views.value[index - 1]?.position ?? null, views.value[index + 1]?.position ?? null)
	update.mutate({projectId: props.projectId, viewId: moved.id, view: createProjectViewUpdate({...moved, position})})
}

async function deleteView(view: ProjectView) {
	if (!view.id) {
		return
	}
	const confirmed = await confirm({
		title: t('projectViews.deleteTitle'),
		description: t('projectViews.deleteDescription', {view: viewTitle(view, t)}),
		confirmLabel: t('projectViews.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId: props.projectId, viewId: view.id})
	}
}

const saving = computed(() => create.isPending.value || update.isPending.value)
</script>

<template>
	<ModalPage
		:title="t('projectViews.title')"
		:in-modal="inModal"
	>
		<VueDraggable
			v-model="views"
			tag="ul"
			role="list"
			handle="[data-drag-handle]"
			:animation="150"
			ghost-class="opacity-40"
			class="grid gap-1"
			@end="onDrop"
		>
			<li
				v-for="view in views"
				:key="view.id"
				class="rounded-md border border-line"
			>
				<div class="flex min-h-11 items-center gap-2 ps-1 pe-2">
					<span
						data-drag-handle
						class="grid size-8 shrink-0 cursor-grab place-items-center text-ink-faint active:cursor-grabbing"
						:aria-label="t('projectViews.reorder')"
					>
						<UiIcon :icon="GripVertical" />
					</span>
					<UiIcon
						v-if="view.view_kind"
						:icon="VIEW_ICONS[view.view_kind]"
						class="text-ink-muted"
					/>
					<span class="min-w-0 flex-1 truncate text-base">{{ viewTitle(view, t) }}</span>
					<span
						v-if="view.filter?.filter"
						class="hidden max-w-48 truncate font-mono text-2xs text-ink-faint sm:inline"
					>{{ view.filter.filter }}</span>
					<UiIconButton
						:icon="Pencil"
						:label="t('projectViews.edit', {view: viewTitle(view, t)})"
						size="sm"
						@click="editingId === view.id ? editingId = null : startEdit(view)"
					/>
					<UiIconButton
						:icon="Trash2"
						:label="t('projectViews.deleteNamed', {view: viewTitle(view, t)})"
						size="sm"
						:disabled="views.length <= 1"
						class="text-danger"
						@click="deleteView(view)"
					/>
				</div>
				<div
					v-if="editingId === view.id"
					class="grid gap-4 border-t border-line p-4"
				>
					<ViewForm
						v-model="draft"
						:form-id="`view-${view.id}`"
						:project-id="projectId"
						kind-locked
						@submit="save"
					/>
					<div class="flex justify-end gap-2">
						<UiButton
							variant="ghost"
							@click="editingId = null"
						>
							{{ t('ui.cancel') }}
						</UiButton>
						<UiButton
							type="submit"
							:form="`view-${view.id}`"
							variant="primary"
							:loading="saving"
						>
							{{ t('projectSettings.save') }}
						</UiButton>
					</div>
				</div>
			</li>
		</VueDraggable>

		<div
			v-if="editingId === 'new'"
			class="grid gap-4 rounded-md border border-accent-line p-4"
		>
			<ViewForm
				v-model="draft"
				form-id="view-new"
				:project-id="projectId"
				@submit="save"
			/>
			<div class="flex justify-end gap-2">
				<UiButton
					variant="ghost"
					@click="editingId = null"
				>
					{{ t('ui.cancel') }}
				</UiButton>
				<UiButton
					type="submit"
					form="view-new"
					variant="primary"
					:loading="saving"
				>
					{{ t('projectViews.create') }}
				</UiButton>
			</div>
		</div>
		<UiButton
			v-else
			variant="ghost"
			:icon="Plus"
			class="justify-self-start"
			@click="startCreate"
		>
			{{ t('projectViews.new') }}
		</UiButton>
	</ModalPage>
</template>
