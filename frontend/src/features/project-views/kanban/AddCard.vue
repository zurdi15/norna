<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {Ban, Plus} from '@lucide/vue'

import type {Task} from '@/client/generated'
import {useQuickAddTaskMutation} from '@/client/queries/tasks'
import MagicMirror from '@/features/tasks/quick-add/MagicMirror'
import {useQuickAddSettings} from '@/features/tasks/useQuickAddSettings'
import {success} from '@/message'
import {parseTaskText, PREFIXES} from '@/modules/quickAddMagic'
import {highlightMagic} from '@/modules/quickAddMagic/highlight'
import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'
import UiSpinner from '@/ui/UiSpinner.vue'
import UiTooltip from '@/ui/UiTooltip.vue'

import {bottomPosition} from './kanban'
import {useKanbanBoard} from './useKanbanBoard'

/** "+ Add a task" at the foot of a column: quick add (with its magic) straight into that column. */
const props = defineProps<{
	bucketId: number
	// The column's loaded cards, so the new one lands below them.
	tasks: readonly Task[]
	full: boolean
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const board = useKanbanBoard()
const settings = useQuickAddSettings()
const quickAdd = useQuickAddTaskMutation()

const open = ref(false)
const text = ref('')
const input = useTemplateRef<HTMLTextAreaElement>('input')

const title = computed(() => text.value.replace(/\s*\n\s*/g, ' ').trim())
const prefixes = computed(() => PREFIXES[settings.value.magicMode])
const highlighted = computed(() => [highlightMagic(text.value, parseTaskText(text.value, settings.value.magicMode), prefixes.value)])

async function start() {
	if (props.full) {
		return
	}
	open.value = true
	await nextTick()
	input.value?.focus()
}

function close() {
	open.value = false
	text.value = ''
}

async function submit() {
	if (title.value === '' || quickAdd.isPending.value) {
		return
	}
	const bucketId = props.bucketId
	try {
		const {task} = await quickAdd.mutateAsync({
			...settings.value,
			title: title.value,
			projectId: board.projectId.value,
			bucketId,
			position: bottomPosition(props.tasks),
		})
		text.value = ''
		// The magic can send it to another project, where this board won't show it.
		if (task.project_id !== board.projectId.value) {
			success({message: t('quickAdd.created', {title: task.title})}, [{
				title: t('tasks.actions.open'),
				callback: () => void router.push({name: 'task.detail', params: {id: task.id}}),
			}])
		}
	} catch {
		// Reported by the mutation; the text stays for another try.
	}
	if (open.value && props.bucketId === bucketId) {
		input.value?.focus()
	}
}

// Not v-model: it waits for a keyboard's composition to end, and phone keyboards compose
// every word, so the highlighted copy (the only visible text) lagged a word behind.
function onInput(event: Event) {
	text.value = (event.target as HTMLTextAreaElement).value
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.isComposing) {
		event.preventDefault()
		void submit()
	} else if (event.key === 'Escape') {
		event.preventDefault()
		close()
	}
}

function onBlur() {
	if (title.value === '' && !quickAdd.isPending.value) {
		close()
	}
}
</script>

<template>
	<form
		v-if="open"
		class="relative rounded-lg border border-accent bg-surface px-3 py-2 ring-3 ring-accent/20"
		@submit.prevent="submit"
	>
		<!-- The textarea's text is transparent over a copy that carries the magic's highlights. -->
		<div class="grid text-md/snug pointer-fine:text-base/snug">
			<MagicMirror
				:lines="highlighted"
				class="pointer-events-none col-start-1 row-start-1 wrap-break-word whitespace-pre-wrap text-ink"
			/>
			<textarea
				ref="input"
				:value="text"
				rows="1"
				enterkeyhint="done"
				autocomplete="off"
				:aria-label="t('projectView.list.add')"
				:placeholder="t('projectView.list.add')"
				:aria-busy="quickAdd.isPending.value || undefined"
				class="
					col-start-1 row-start-1 resize-none overflow-hidden bg-transparent wrap-break-word
					whitespace-pre-wrap text-transparent caret-accent
					selection:bg-accent/25 selection:text-transparent
					placeholder:text-ink-faint
					focus:outline-none
				"
				@input="onInput"
				@keydown="onKeydown"
				@blur="onBlur"
			/>
		</div>
		<UiSpinner
			v-if="quickAdd.isPending.value"
			class="absolute inset-e-2 top-2.5 text-ink-faint"
		/>
	</form>
	<UiTooltip
		v-else
		:content="full ? t('kanban.fullHint') : undefined"
	>
		<button
			type="button"
			:aria-disabled="full || undefined"
			:class="cn(
				'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-ink-faint',
				'transition-colors duration-150 hover:bg-surface hover:text-ink pointer-coarse:h-11 pointer-coarse:text-md',
				'aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-transparent',
				'aria-disabled:hover:text-ink-faint',
			)"
			@click="start"
		>
			<UiIcon :icon="full ? Ban : Plus" />
			{{ full ? t('kanban.full') : t('projectView.list.add') }}
		</button>
	</UiTooltip>
</template>
