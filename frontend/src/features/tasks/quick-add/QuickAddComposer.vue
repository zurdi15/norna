<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {ArrowUp, Calendar, FolderClosed, Repeat, Rows3} from '@lucide/vue'

import {useQuickAddTaskMutation, useQuickAddTasksMutation} from '@/client/queries/tasks'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import {success} from '@/message'
import {highlightMagic} from '@/modules/quickAddMagic/highlight'
import {parseTaskText, PREFIXES} from '@/modules/quickAddMagic'
import {resolveQuickAddProjectId} from '@/modules/task/quickAdd'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiChip from '@/ui/UiChip.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiIconButton from '@/ui/UiIconButton.vue'

import PriorityMark from '../PriorityMark.vue'
import {priorityLabelKey} from '../priority'
import ProjectPicker from '../properties/ProjectPicker.vue'
import {useQuickAddSettings} from '../useQuickAddSettings'
import MagicMirror from './MagicMirror'

/**
 * Writes tasks the fast way: the title carries its own date, labels, project and
 * priority ("Call the plumber tomorrow *home !4"). What the magic understood is
 * highlighted in place and listed as chips below. One line per task.
 */
const props = defineProps<{
	// Where tasks go when the text names no project.
	defaultProjectId: number
}>()

const emit = defineEmits<{
	created: []
}>()

const {t} = useI18n()
const router = useRouter()
const projects = useProjects()
const dates = useTaskDateFormat()
const settings = useQuickAddSettings()
const quickAdd = useQuickAddTaskMutation()
const quickAddMany = useQuickAddTasksMutation()

const text = ref('')
const pickedProjectId = ref<number | null>(null)
const projectPickerOpen = ref(false)
const input = useTemplateRef<HTMLTextAreaElement>('input')

const projectId = computed(() => pickedProjectId.value ?? props.defaultProjectId)
const prefixes = computed(() => PREFIXES[settings.value.magicMode])
const lines = computed(() => text.value.split('\n').map(line => line.trim()).filter(Boolean))
const firstLine = computed(() => lines.value[0] ?? '')
const parsed = computed(() => parseTaskText(firstLine.value, settings.value.magicMode))

// The highlight mirrors every line; each is parsed on its own, as it becomes its own task.
const highlighted = computed(() => text.value.split('\n').map(line =>
	highlightMagic(line, parseTaskText(line, settings.value.magicMode), prefixes.value)))

const targetProject = computed(() => {
	const id = resolveQuickAddProjectId(parsed.value.project, projects.projectsArray, projectId.value)
	return id === null ? undefined : projects.projects[id]
})

const busy = computed(() => quickAdd.isPending.value || quickAddMany.isPending.value)
const canSubmit = computed(() => lines.value.length > 0 && !busy.value)

const hint = computed(() => {
	const current = prefixes.value
	return current
		? t('quickAdd.hint', {label: current.label, project: current.project, priority: current.priority, assignee: current.assignee})
		: ''
})

function focus() {
	input.value?.focus()
}

async function submit() {
	if (!canSubmit.value) {
		return
	}
	try {
		if (lines.value.length > 1) {
			const result = await quickAddMany.mutateAsync({
				...settings.value,
				entries: lines.value.map(title => ({title, projectId: projectId.value})),
			})
			const created = result.tasks.filter(task => task !== null).length
			success({message: t('quickAdd.createdMany', {count: created})})
		} else {
			const {task} = await quickAdd.mutateAsync({...settings.value, title: lines.value[0]!, projectId: projectId.value})
			success({message: t('quickAdd.created', {title: task.title})}, [{
				title: t('tasks.actions.open'),
				callback: () => void router.push({name: 'task.detail', params: {id: task.id}}),
			}])
		}
		text.value = ''
		emit('created')
	} catch {
		// Reported by the mutation; the text stays for another try.
	} finally {
		focus()
	}
}

// Not v-model: it waits for a keyboard's composition to end, and phone keyboards compose
// every word, so the highlighted copy (the only visible text) lagged a word behind.
function onInput(event: Event) {
	text.value = (event.target as HTMLTextAreaElement).value
}

function onKeydown(event: KeyboardEvent) {
	// Enter sends; Shift+Enter starts another line, i.e. another task.
	if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
		event.preventDefault()
		void submit()
	}
}

function pickProject(id: number) {
	pickedProjectId.value = id
	projectPickerOpen.value = false
	focus()
}

defineExpose({focus})
</script>

<template>
	<form
		class="grid"
		@submit.prevent="submit"
	>
		<div class="grid gap-3 px-4 py-3">
			<!-- The textarea's text is transparent over a copy that carries the highlights. -->
			<div class="grid max-h-[40dvh] overflow-y-auto text-lg/relaxed">
				<MagicMirror
					:lines="highlighted"
					class="pointer-events-none col-start-1 row-start-1 wrap-break-word whitespace-pre-wrap text-ink"
				/>
				<textarea
					ref="input"
					:value="text"
					rows="1"
					enterkeyhint="send"
					autocomplete="off"
					data-autofocus
					:aria-label="t('quickAdd.label')"
					:aria-describedby="hint ? 'quick-add-hint' : undefined"
					:placeholder="t('quickAdd.placeholder')"
					class="
						col-start-1 row-start-1 resize-none overflow-hidden bg-transparent wrap-break-word
						whitespace-pre-wrap text-transparent caret-accent
						selection:bg-accent/25 selection:text-transparent
						placeholder:text-ink-faint
						focus:outline-none
					"
					@input="onInput"
					@keydown="onKeydown"
				/>
			</div>

			<div
				v-if="lines.length"
				class="flex flex-wrap gap-1.5"
			>
				<UiChip
					v-if="lines.length > 1"
					:icon="Rows3"
					tone="accent"
				>
					{{ t('quickAdd.lines', {count: lines.length}) }}
				</UiChip>
				<template v-else>
					<UiChip
						v-if="parsed.date"
						:icon="Calendar"
						tone="accent"
					>
						<span class="font-mono text-xs">{{ dates.dateTime(parsed.date) }}</span>
					</UiChip>
					<UiChip
						v-if="parsed.repeats"
						:icon="Repeat"
					>
						{{ t('quickAdd.repeats') }}
					</UiChip>
					<UiChip
						v-for="label in parsed.labels"
						:key="label"
					>
						{{ label }}
					</UiChip>
					<UiChip v-if="parsed.priority">
						<PriorityMark
							:priority="parsed.priority"
							decorative
						/>
						{{ t(priorityLabelKey(parsed.priority)) }}
					</UiChip>
					<UiChip
						v-for="assignee in parsed.assignees"
						:key="assignee"
					>
						@{{ assignee }}
					</UiChip>
				</template>
			</div>
			<p
				v-if="hint"
				id="quick-add-hint"
				class="font-mono text-2xs text-ink-faint"
			>
				{{ hint }}
			</p>
		</div>

		<div class="flex items-center gap-1 border-t border-line py-2 ps-2 pe-3">
			<UiAdaptivePopover
				v-model:open="projectPickerOpen"
				:title="t('taskDetail.properties.project')"
				side="top"
			>
				<template #trigger>
					<UiButton
						variant="ghost"
						size="sm"
						:icon="targetProject ? undefined : FolderClosed"
						:aria-label="t('quickAdd.project', {project: targetProject?.title ?? ''})"
					>
						<UiColorDot
							v-if="targetProject"
							:color="targetProject.hex_color"
						/>
						<span class="max-w-40 truncate">{{ targetProject?.title ?? t('quickAdd.noProject') }}</span>
					</UiButton>
				</template>
				<ProjectPicker
					:model-value="projectId"
					@select="pickProject"
				/>
			</UiAdaptivePopover>
			<span class="flex-1" />
			<span class="hidden font-mono text-2xs text-ink-faint pointer-fine:inline">{{ t('quickAdd.newLineHint') }}</span>
			<UiIconButton
				:icon="ArrowUp"
				:label="lines.length > 1 ? t('quickAdd.submitMany', {count: lines.length}) : t('quickAdd.submit')"
				variant="primary"
				type="submit"
				shortcut="Enter"
				:disabled="!lines.length"
				:loading="busy"
			/>
		</div>
	</form>
</template>
