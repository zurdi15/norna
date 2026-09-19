<script setup lang="ts">
import {computed, ref, watch, type Component} from 'vue'
import {toast} from 'vue-sonner'
import {
	ArrowRightLeft,
	Copy,
	Ellipsis,
	Flag,
	Link2,
	List,
	ListFilter,
	Monitor,
	Moon,
	Plus,
	SquareKanban,
	Star,
	Sun,
	Table2,
	Tag,
	Trash2,
} from '@lucide/vue'

import NornaMark from '@/features/shell/NornaMark.vue'
import type {UiMenuEntry} from '@/ui/menu'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiAvatar from '@/ui/UiAvatar.vue'
import UiAvatarStack from '@/ui/UiAvatarStack.vue'
import UiButton from '@/ui/UiButton.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiChip from '@/ui/UiChip.vue'
import UiColorSwatches from '@/ui/UiColorSwatches.vue'
import UiContextMenu from '@/ui/UiContextMenu.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiField from '@/ui/UiField.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiInput from '@/ui/UiInput.vue'
import UiKbd from '@/ui/UiKbd.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiMenu from '@/ui/UiMenu.vue'
import UiProgress from '@/ui/UiProgress.vue'
import UiProgressRing from '@/ui/UiProgressRing.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSegmented from '@/ui/UiSegmented.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'
import UiSwitch from '@/ui/UiSwitch.vue'
import UiTabs from '@/ui/UiTabs.vue'
import UiTextarea from '@/ui/UiTextarea.vue'

// Feature sections live next to this page, one file each, so they can grow without touching it.
const featureSections = Object.entries(import.meta.glob<{default: Component}>('./catalog/*.vue', {eager: true}))
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([path, module]) => ({key: path, component: module.default}))

// Dev-only page: the copy is sample content, not translated UI.
type Theme = 'system' | 'light' | 'dark'
const theme = ref<Theme>('system')
watch(theme, value => {
	const root = document.documentElement
	if (value === 'system') {
		root.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	} else {
		root.dataset.theme = value
	}
})

const view = ref<'list' | 'kanban' | 'table'>('list')
const tab = ref<'activity' | 'comments' | 'history'>('activity')
const title = ref('Migrar los backups a restic')
const project = ref<number>(2)
const notes = ref('Revisar retención y probar una restauración completa.')
const emailReminders = ref(true)
const agree = ref<boolean | 'indeterminate'>('indeterminate')
const color = ref('#249c74')
const dueDate = ref<Date | null>(new Date())
const dialogOpen = ref(false)
const confirmOpen = ref(false)
const loading = ref(false)

const projects = [
	{value: 1, label: 'Homelab'},
	{value: 2, label: 'Casa'},
	{value: 3, label: 'Norna'},
	{value: 4, label: 'Viaje a Noruega'},
]

interface DemoLabel {
	id: number
	title: string
	hex: string
}
const labels = ref<DemoLabel[]>([
	{id: 1, title: 'diseño', hex: '#9a6ec9'},
	{id: 2, title: 'frontend', hex: '#1f93b8'},
	{id: 3, title: 'infra', hex: '#c06f0a'},
	{id: 4, title: 'compras', hex: '#5d9850'},
	{id: 5, title: 'lectura', hex: '#9f8400'},
])
const selectedLabels = ref<number[]>([1, 2])
const pickedLabels = computed(() => labels.value.filter(label => selectedLabels.value.includes(label.id)))

function createLabel(query: string) {
	const id = Math.max(...labels.value.map(label => label.id)) + 1
	labels.value.push({id, title: query, hex: '#7a8798'})
	selectedLabels.value = [...selectedLabels.value, id]
}

const priority = ref<number>(3)
const priorities = [
	{id: 0, title: 'Sin prioridad'},
	{id: 1, title: 'Baja'},
	{id: 2, title: 'Media'},
	{id: 3, title: 'Alta'},
	{id: 4, title: 'Urgente'},
	{id: 5, title: 'Hazlo ya'},
]
const priorityOpen = ref(false)

const menuItems: UiMenuEntry[] = [
	{label: 'Duplicar', icon: Copy, shortcut: 'Mod+KeyD', onSelect: () => toast.success('Tarea duplicada')},
	{label: 'Mover a…', icon: ArrowRightLeft, shortcut: 'KeyM', onSelect: () => toast('Mover a…')},
	{label: 'Copiar enlace', icon: Link2, onSelect: () => toast.success('Enlace copiado')},
	{type: 'separator'},
	{label: 'Borrar', icon: Trash2, tone: 'danger', onSelect: () => confirmOpen.value = true},
]

const people = [
	{id: 1, name: 'zurdi'},
	{id: 2, name: 'Astrid Lund'},
	{id: 3, name: 'Leif Berg'},
	{id: 4, name: 'Sigrid Ek'},
]

function simulateSave() {
	loading.value = true
	setTimeout(() => {
		loading.value = false
		toast.success('Cambios guardados', {action: {label: 'Deshacer', onClick: () => toast('Deshecho')}})
	}, 1200)
}
</script>

<template>
	<div class="min-h-dvh">
		<header class="sticky top-0 z-(--z-sticky) border-b border-line bg-canvas/90 pt-safe backdrop-blur-md">
			<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2.5">
				<NornaMark />
				<p class="font-semibold">
					Catálogo
				</p>
				<span class="font-mono text-2xs text-ink-faint">src/ui</span>
				<span class="flex-1" />
				<UiSegmented
					v-model="theme"
					label="Tema"
					size="sm"
					:items="[
						{value: 'system', label: 'Sistema', icon: Monitor, iconOnly: true},
						{value: 'light', label: 'Claro', icon: Sun, iconOnly: true},
						{value: 'dark', label: 'Oscuro', icon: Moon, iconOnly: true},
					]"
				/>
			</div>
		</header>

		<main class="mx-auto grid max-w-5xl gap-10 px-4 py-8 pb-safe">
			<section class="grid gap-4">
				<UiSectionHeading
					title="Botones"
					caption="Acciones"
				/>
				<div class="flex flex-wrap items-center gap-2">
					<UiButton
						variant="primary"
						:icon="Plus"
						shortcut="Enter"
					>
						Crear tarea
					</UiButton>
					<UiButton>Cancelar</UiButton>
					<UiButton
						variant="ghost"
						:icon="ListFilter"
					>
						Filtrar
					</UiButton>
					<UiButton
						variant="danger"
						:icon="Trash2"
					>
						Borrar
					</UiButton>
					<UiButton
						variant="primary"
						:loading="loading"
						@click="simulateSave"
					>
						Guardar
					</UiButton>
					<UiButton size="sm">
						Pequeño
					</UiButton>
					<UiButton
						variant="primary"
						size="lg"
					>
						Grande · 44px
					</UiButton>
					<UiIconButton
						:icon="Star"
						label="Marcar como favorita"
						shortcut="KeyS"
					/>
					<UiIconButton
						:icon="Ellipsis"
						label="Más acciones"
						variant="secondary"
					/>
				</div>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Campos"
					caption="Formularios"
				/>
				<div class="grid gap-4 md:grid-cols-2">
					<UiField
						label="Título"
						hint="Admite la sintaxis mágica del quick add."
					>
						<UiInput
							v-model="title"
							placeholder="¿Qué hay que hacer?"
						/>
					</UiField>
					<UiField
						label="Proyecto"
						required
					>
						<UiSelect
							v-model="project"
							:items="projects"
							placeholder="Elige un proyecto"
						/>
					</UiField>
					<UiField
						label="Correo"
						error="Escribe una dirección con @."
					>
						<UiInput
							model-value="zurdi.example"
							type="email"
						/>
					</UiField>
					<UiField label="Buscar">
						<UiInput placeholder="Buscar tareas…">
							<template #trailing>
								<UiKbd shortcut="Mod+KeyK" />
							</template>
						</UiInput>
					</UiField>
					<UiField
						label="Notas"
						class="md:col-span-2"
					>
						<UiTextarea v-model="notes" />
					</UiField>
				</div>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Selección"
					caption="Controles"
				/>
				<div class="flex flex-wrap items-center gap-6">
					<UiCheckbox v-model="agree">
						Todas las subtareas
					</UiCheckbox>
					<label class="flex items-center gap-2.5">
						<UiSwitch v-model="emailReminders" />
						Recordatorios por email
					</label>
					<UiSegmented
						v-model="view"
						label="Vista"
						:items="[
							{value: 'list', label: 'Lista', icon: List},
							{value: 'kanban', label: 'Kanban', icon: SquareKanban},
							{value: 'table', label: 'Tabla', icon: Table2},
						]"
					/>
				</div>
				<UiColorSwatches
					v-model="color"
					label="Color de la etiqueta"
				/>
				<UiTabs
					v-model="tab"
					label="Actividad de la tarea"
					:tabs="[
						{value: 'activity', label: 'Actividad'},
						{value: 'comments', label: 'Comentarios', count: 3},
						{value: 'history', label: 'Historial'},
					]"
				/>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Chips y personas"
					caption="Metadatos"
					:count="pickedLabels.length"
				/>
				<div class="flex flex-wrap items-center gap-2">
					<UiChip
						v-for="label in pickedLabels"
						:key="label.id"
						:color="label.hex"
						removable
						:label="label.title"
						@remove="selectedLabels = selectedLabels.filter(id => id !== label.id)"
					>
						{{ label.title }}
					</UiChip>
					<UiChip
						as="button"
						:icon="ListFilter"
						:pressed="view === 'kanban'"
						@click="view = view === 'kanban' ? 'list' : 'kanban'"
					>
						Filtro pulsable
					</UiChip>
					<UiChip tone="success">
						Hecha
					</UiChip>
					<UiChip tone="warning">
						Urgente
					</UiChip>
					<UiChip tone="danger">
						Vencida
					</UiChip>
				</div>
				<div class="flex flex-wrap items-center gap-6">
					<UiAvatar
						name="zurdi"
						size="lg"
					/>
					<UiAvatarStack :people="people" />
					<UiProgressRing
						:value="2"
						:max="3"
						label="2 de 3 subtareas"
						class="size-6"
					/>
					<div class="grid w-48 gap-1">
						<UiProgress
							:value="60"
							label="Progreso"
						/>
						<span class="font-mono text-2xs text-ink-faint">60%</span>
					</div>
					<UiSpinner label="Cargando" />
					<div class="grid w-40 gap-2">
						<UiSkeleton class="w-3/4" />
						<UiSkeleton class="w-1/2" />
					</div>
				</div>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Superposiciones"
					caption="Popover o sheet según el ancho"
				/>
				<div class="flex flex-wrap items-center gap-2">
					<UiAdaptivePopover title="Etiquetas">
						<template #trigger>
							<UiButton :icon="Tag">
								Etiquetas
							</UiButton>
						</template>
						<UiListbox
							v-model="selectedLabels"
							:items="labels"
							:item-key="label => label.id"
							:item-label="label => label.title"
							label="Etiquetas"
							multiple
							creatable
							@create="createLabel"
						>
							<template #item="{item}">
								<span
									class="size-2 shrink-0 rounded-full"
									:style="{backgroundColor: item.hex}"
								/>
								<span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
							</template>
						</UiListbox>
					</UiAdaptivePopover>

					<UiAdaptivePopover
						v-model:open="priorityOpen"
						title="Prioridad"
					>
						<template #trigger>
							<UiButton :icon="Flag">
								{{ priorities.find(p => p.id === priority)?.title }}
							</UiButton>
						</template>
						<UiListbox
							v-model="priority"
							:items="priorities"
							:item-key="p => p.id"
							:item-label="p => p.title"
							:searchable="false"
							label="Prioridad"
							@select="priorityOpen = false"
						/>
					</UiAdaptivePopover>

					<UiMenu
						title="Acciones de la tarea"
						:items="menuItems"
					>
						<template #trigger>
							<UiIconButton
								:icon="Ellipsis"
								label="Acciones de la tarea"
								variant="secondary"
							/>
						</template>
					</UiMenu>

					<UiDialog
						v-model:open="dialogOpen"
						title="Nuevo proyecto"
						description="Los proyectos agrupan tareas y vistas."
					>
						<template #trigger>
							<UiButton variant="primary">
								Abrir diálogo
							</UiButton>
						</template>
						<div class="grid gap-4">
							<UiField label="Nombre">
								<UiInput placeholder="Viaje a Noruega" />
							</UiField>
							<UiField label="Color">
								<UiColorSwatches
									v-model="color"
									label="Color del proyecto"
								/>
							</UiField>
						</div>
						<template #footer="{close}">
							<UiButton @click="close">
								Cancelar
							</UiButton>
							<UiButton
								variant="primary"
								@click="close"
							>
								Crear proyecto
							</UiButton>
						</template>
					</UiDialog>

					<UiButton @click="toast.error('No se pudo guardar la tarea. Comprueba la conexión.')">
						Aviso de error
					</UiButton>
				</div>

				<UiContextMenu
					title="Acciones de la tarea"
					:items="menuItems"
				>
					<div
						class="
							rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-muted select-none
							touch-callout-none
						"
					>
						Clic derecho aquí (o pulsación larga en el móvil) para abrir el menú contextual.
					</div>
				</UiContextMenu>

				<UiDialog
					v-model:open="confirmOpen"
					title="¿Borrar la tarea?"
					description="Se borrará con sus comentarios y adjuntos. No se puede deshacer."
					size="sm"
				>
					<template #footer="{close}">
						<UiButton @click="close">
							Cancelar
						</UiButton>
						<UiButton
							variant="danger"
							@click="close(); toast.success('Tarea borrada')"
						>
							Borrar
						</UiButton>
					</template>
				</UiDialog>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Calendario"
					caption="Fechas"
				/>
				<div class="max-w-72 rounded-lg border border-line bg-surface p-3">
					<UiCalendar v-model="dueDate" />
				</div>
				<p class="font-mono text-xs text-ink-muted">
					{{ dueDate?.toString() ?? 'Sin fecha' }}
				</p>
			</section>

			<section class="grid gap-4">
				<UiSectionHeading
					title="Estado vacío"
					caption="Skuld · lo que será"
				/>
				<UiEmptyState
					title="Nada pendiente para esta semana"
					description="Las tareas con fecha en los próximos siete días aparecerán aquí."
					class="rounded-lg border border-line bg-surface"
				>
					<template #actions>
						<UiButton
							variant="primary"
							:icon="Plus"
						>
							Nueva tarea
						</UiButton>
					</template>
				</UiEmptyState>
			</section>

			<component
				:is="section.component"
				v-for="section in featureSections"
				:key="section.key"
			/>
		</main>
	</div>
</template>
