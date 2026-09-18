<script setup lang="ts">
import {provide, ref} from 'vue'

import type {Label, User} from '@/client/generated'
import type {ProjectResponse} from '@/client/queries/projects'
import {filterDataKey, useFilterConversion, type FilterData} from '@/features/filters/filterData'
import FilterInput from '@/features/filters/FilterInput.vue'
import TaskFilterButton, {type TaskFilterValue} from '@/features/filters/TaskFilterButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'

// Dev-only section: the copy is sample content, not translated UI. It brings its own labels,
// projects and people so it works without an account.
const labels = ref<Label[]>([
	{id: 1, title: 'casa', hex_color: '5d9850'},
	{id: 2, title: 'compras', hex_color: 'c06f0a'},
	{id: 3, title: 'diseño', hex_color: '9a6ec9'},
	{id: 4, title: 'infra', hex_color: '1f93b8'},
	{id: 5, title: 'lectura', hex_color: '9f8400'},
	{id: 6, title: 'urgente', hex_color: 'd24b4b'},
])

const projects = ref([
	{id: 1, title: 'Homelab', hex_color: '1f93b8', parent_project_id: 0, is_archived: false},
	{id: 2, title: 'Casa', hex_color: '5d9850', parent_project_id: 0, is_archived: false},
	{id: 3, title: 'Norna', hex_color: '4f6d8f', parent_project_id: 0, is_archived: false},
	{id: 4, title: 'Viaje a Noruega', hex_color: '9a6ec9', parent_project_id: 0, is_archived: false},
	{id: 5, title: 'Reservas', hex_color: '', parent_project_id: 4, is_archived: false},
] as ProjectResponse[])

const people: User[] = [
	{id: 1, username: 'zurdi', name: 'Zurdi'},
	{id: 2, username: 'astrid', name: 'Astrid Lund'},
	{id: 3, username: 'bjorn', name: 'Bjørn Dahl'},
	{id: 4, username: 'ingrid', name: ''},
]

const sampleData: FilterData = {
	labels,
	projects,
	searchUsers: async query => {
		await new Promise(resolve => setTimeout(resolve, 150))
		const wanted = query.toLowerCase()
		return people.filter(user => `${user.username} ${user.name}`.toLowerCase().includes(wanted))
	},
}

provide(filterDataKey, sampleData)
const {toApi} = useFilterConversion(sampleData)

const query = ref('done = false && labels in urgente, casa && dueDate < now+7d')
const submitted = ref('')

const empty = ref<TaskFilterValue>({filter: '', filter_include_nulls: false})
const inProject = ref<TaskFilterValue>({filter: 'done = false && labels in 6 && due_date < now+7d', filter_include_nulls: true})

const panel = 'grid content-start gap-3 rounded-lg border border-line bg-surface p-4'
</script>

<template>
	<section class="grid gap-4">
		<UiSectionHeading
			title="Filtros"
			caption="Consulta · autocompletado · botón"
		/>
		<div class="grid gap-6 md:grid-cols-2">
			<div :class="panel">
				<span class="caption">Consulta</span>
				<FilterInput
					v-model="query"
					@submit="submitted = query"
				/>
				<p class="text-xs text-ink-faint">
					Prueba a escribir «labels in», «assignees in» o «project =» seguido de un espacio. Enter envía.
				</p>
				<dl class="grid gap-1 font-mono text-xs">
					<dt class="caption">
						api
					</dt>
					<dd class="break-all text-ink-muted">
						{{ toApi(query) || '—' }}
					</dd>
					<dt class="mt-1 caption">
						submit
					</dt>
					<dd class="break-all text-ink-muted">
						{{ submitted || '—' }}
					</dd>
				</dl>
			</div>

			<div :class="panel">
				<span class="caption">Botón de filtro</span>
				<div class="flex flex-wrap items-center gap-2">
					<TaskFilterButton v-model="empty" />
					<TaskFilterButton
						v-model="inProject"
						:project-id="2"
					/>
				</div>
				<dl class="grid gap-1 font-mono text-xs">
					<dt class="caption">
						sin filtro
					</dt>
					<dd class="break-all text-ink-muted">
						{{ JSON.stringify(empty) }}
					</dd>
					<dt class="mt-1 caption">
						en un proyecto
					</dt>
					<dd class="break-all text-ink-muted">
						{{ JSON.stringify(inProject) }}
					</dd>
				</dl>
			</div>
		</div>
	</section>
</template>
