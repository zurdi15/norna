<script setup lang="ts">
import {computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes} from 'vue'
import {useI18n} from 'vue-i18n'
import {EditorContent, useEditor, type Editor} from '@tiptap/vue-3'
import {Extension, Node} from '@tiptap/core'
import {Placeholder, UndoRedo} from '@tiptap/extensions'
import {autoUpdate, computePosition, flip, offset, shift, size} from '@floating-ui/dom'

import type {User} from '@/client/generated'
import {getPopupContainer} from '@/features/editor/popupContainer'
import SuggestionList from '@/features/editor/SuggestionList.vue'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {getDisplayName} from '@/modules/user/displayName'
import {cn} from '@/ui/cn'
import {fieldBoxVariants} from '@/ui/field'
import {matchesSearch, normalizeForSearch} from '@/ui/search'
import UiColorDot from '@/ui/UiColorDot.vue'

import {
	applyFilterSuggestion,
	dismissFilterAutocomplete,
	FilterAutocomplete,
	filterAutocompleteKey,
	type AutocompleteContext,
	type AutocompleteKind,
} from './FilterAutocomplete'
import {useFilterData} from './filterData'
import {spaceToken} from './filterQuery'
import {createFilterHighlighter, filterHighlighterKey} from './highlighter'
import './filterInput.css'

/**
 * The filter query input: one wrapping line of mono text with the query highlighted and
 * suggestions for labels, projects and people while typing their values. The model is the
 * query as people read it (names, not ids). Enter emits `submit` unless it picks a suggestion,
 * and Escape emits `cancel` unless it closes the suggestions.
 */
const props = withDefaults(defineProps<{
	// The accessible name; the input has no visible label of its own.
	label?: string
	placeholder?: string
	// Suggests the project's members, and no projects: inside a project that field doesn't apply.
	projectId?: number
	autofocus?: boolean
	class?: HTMLAttributes['class']
}>(), {
	label: undefined,
	placeholder: undefined,
	projectId: undefined,
	autofocus: false,
	class: undefined,
})

const emit = defineEmits<{
	submit: [value: string]
	cancel: []
}>()

const model = defineModel<string>({default: ''})

const {t} = useI18n()
const data = useFilterData()

const root = useTemplateRef<HTMLElement>('root')
const floating = useTemplateRef<HTMLElement>('floating')
const list = useTemplateRef<{onKeyDown: (event: KeyboardEvent) => boolean}>('list')

interface Suggestion {
	key: string
	// What goes into the query.
	value: string
	title: string
	detail?: string
	color?: string | null
	username?: string
}

const MAX_SUGGESTIONS = 8
const USER_SEARCH_DELAY = 200

// What the editor holds; kept in step with the model by the watcher below.
// eslint-disable-next-line vue/no-ref-object-reactivity-loss
let current = model.value

const focused = ref(false)
const context = shallowRef<AutocompleteContext | null>(null)
const suggestions = shallowRef<{kind: AutocompleteKind, items: Suggestion[]} | null>(null)
let request = 0
let userSearchTimer: ReturnType<typeof setTimeout> | undefined

// Prefix matches first, then the rest in their original order.
function rank<T>(items: T[], title: (item: T) => string, search: string): T[] {
	const wanted = normalizeForSearch(search)
	return items
		.filter(item => matchesSearch(title(item), search))
		.map((item, index) => ({item, index, prefix: normalizeForSearch(title(item)).startsWith(wanted) ? 0 : 1}))
		.sort((a, b) => a.prefix - b.prefix || a.index - b.index)
		.map(({item}) => item)
}

function listedValues(next: AutocompleteContext): Set<string> {
	return new Set(next.values.map(value => value.toLowerCase()))
}

function labelSuggestions(next: AutocompleteContext): Suggestion[] {
	const listed = listedValues(next)
	const labels = data.labels.value.filter(label => label.title && !listed.has(label.title.toLowerCase()))
	return rank(labels, label => label.title ?? '', next.search).map(label => ({
		key: `label-${label.id}`,
		value: label.title!,
		title: label.title!,
		color: label.hex_color,
	}))
}

function projectSuggestions(next: AutocompleteContext): Suggestion[] {
	const listed = listedValues(next)
	const projects = data.projects.value.filter(project => !project.is_archived && !listed.has(project.title.toLowerCase()))
	return rank(projects, project => project.title, next.search).map(project => ({
		key: `project-${project.id}`,
		value: project.title,
		title: project.title,
		detail: data.projects.value.find(parent => parent.id === project.parent_project_id)?.title,
		color: project.hex_color,
	}))
}

function userSuggestions(users: User[], next: AutocompleteContext): Suggestion[] {
	const listed = listedValues(next)
	return users
		.filter(user => user.username && !listed.has(user.username.toLowerCase()))
		.map(user => ({
			key: `user-${user.id}`,
			value: user.username!,
			title: getDisplayName(user),
			detail: user.name ? `@${user.username}` : undefined,
			username: user.username!,
		}))
}

function show(kind: AutocompleteKind, items: Suggestion[], next: AutocompleteContext) {
	// A single suggestion that is exactly what was typed has nothing left to offer.
	const done = items.length === 1 && items[0]!.value.toLowerCase() === next.search.toLowerCase()
	suggestions.value = done ? null : {kind, items: items.slice(0, MAX_SUGGESTIONS)}
}

function onContextChange(next: AutocompleteContext | null) {
	context.value = next
	clearTimeout(userSearchTimer)
	const ticket = ++request
	if (next === null || (next.kind === 'projects' && props.projectId !== undefined)) {
		suggestions.value = null
		return
	}
	if (next.kind === 'labels') {
		show('labels', labelSuggestions(next), next)
		return
	}
	if (next.kind === 'projects') {
		show('projects', projectSuggestions(next), next)
		return
	}
	// The previous people stay up while the next search runs, so the list doesn't flicker.
	if (suggestions.value?.kind !== 'users') {
		suggestions.value = null
	}
	userSearchTimer = setTimeout(async () => {
		let users: User[] = []
		try {
			users = await data.searchUsers(next.search, props.projectId)
		} catch (error) {
			console.error('Failed to search users for the filter:', error)
		}
		if (ticket === request) {
			show('users', userSuggestions(users, next), next)
		}
	}, USER_SEARCH_DELAY)
}

const listVisible = computed(() => focused.value
	&& context.value !== null
	&& suggestions.value !== null
	&& suggestions.value.kind === context.value.kind)

const LIST_LABELS: Record<AutocompleteKind, string> = {
	labels: 'shell.nav.labels',
	users: 'editor.mentions',
	projects: 'shell.nav.projects',
}

function onAutocompleteKeyDown(event: KeyboardEvent): boolean {
	const view = liveEditor()?.view
	if (!listVisible.value || !view) {
		return false
	}
	// Closes the list only; the input's own Escape (cancel) waits for the next press.
	if (event.key === 'Escape') {
		dismissFilterAutocomplete(view)
		return true
	}
	return list.value?.onKeyDown(event) ?? false
}

function pick(item: Suggestion) {
	const view = liveEditor()?.view
	if (view && context.value) {
		applyFilterSuggestion(view, context.value, item.value)
	}
}

// The query is plain text on one line: a document of exactly one paragraph.
const QueryDocument = Node.create({
	name: 'doc',
	topNode: true,
	content: 'paragraph',
})

const QueryParagraph = Node.create({
	name: 'paragraph',
	group: 'block',
	content: 'text*',
	parseHTML: () => [{tag: 'p'}],
	renderHTML: ({HTMLAttributes}) => ['p', HTMLAttributes, 0],
})

const QueryText = Node.create({
	name: 'text',
	group: 'inline',
})

// Built as JSON so a query from the url is never parsed as HTML.
function toDocument(text: string) {
	return {
		type: 'doc',
		content: [{type: 'paragraph', content: text === '' ? [] : [{type: 'text', text}]}],
	}
}

function submit() {
	emit('submit', current)
	return true
}

// ProseMirror marks every Escape as handled, so a popover around the input never sees it:
// the parent closes itself on `cancel` instead.
function cancel() {
	emit('cancel')
	return true
}

const QueryKeymap = Extension.create({
	name: 'filterQueryKeymap',
	addKeyboardShortcuts: () => ({
		'Enter': submit,
		'Mod-Enter': submit,
		'Shift-Enter': () => true,
		'Escape': cancel,
	}),
})

const QueryHighlighter = Extension.create({
	name: 'filterHighlighter',
	addProseMirrorPlugins: () => [createFilterHighlighter(() => data.labels.value)],
})

/* eslint-disable vue/no-setup-props-reactivity-loss, vue/no-ref-object-reactivity-loss -- the editor takes its initial state once. */
const editor = useEditor({
	content: toDocument(model.value),
	autofocus: props.autofocus ? 'end' : false,
	extensions: [
		QueryDocument,
		QueryParagraph,
		QueryText,
		UndoRedo,
		Placeholder.configure({
			placeholder: () => props.placeholder ?? t('filters.query.placeholder'),
		}),
		QueryHighlighter,
		FilterAutocomplete.configure({
			onChange: onContextChange,
			onKeyDown: onAutocompleteKeyDown,
		}),
		QueryKeymap,
	],
	editorProps: {
		attributes: () => ({
			class: 'norna-filter-input',
			role: 'textbox',
			'aria-multiline': 'false',
			'aria-label': props.label ?? t('filters.query.label'),
			autocapitalize: 'off',
			autocorrect: 'off',
			autocomplete: 'off',
			spellcheck: 'false',
			enterkeyhint: 'done',
			translate: 'no',
		}),
		handlePaste(view, event) {
			const text = event.clipboardData?.getData('text/plain')
			if (text === undefined) {
				return false
			}
			view.dispatch(view.state.tr.insertText(text.replace(/\s*[\r\n]+\s*/g, ' ')))
			return true
		},
	},
	onUpdate: ({editor: instance}) => {
		current = instance.state.doc.textContent
		model.value = current
	},
	onFocus: () => {
		focused.value = true
	},
	onBlur: () => {
		focused.value = false
	},
})
/* eslint-enable vue/no-setup-props-reactivity-loss, vue/no-ref-object-reactivity-loss */

// useEditor leaves a destroyed instance in the ref after unmount.
function liveEditor(): Editor | undefined {
	const instance = editor.value
	return instance && !instance.isDestroyed ? instance : undefined
}

watch(model, value => {
	const instance = liveEditor()
	if (!instance || value === current) {
		return
	}
	current = value
	instance.chain()
		.setContent(toDocument(value), {emitUpdate: false})
		.setTextSelection(value.length + 1)
		.setMeta(filterAutocompleteKey, {dismiss: true})
		.run()
})

watch(data.labels, () => {
	const instance = liveEditor()
	if (instance) {
		instance.view.dispatch(instance.state.tr.setMeta(filterHighlighterKey, true))
	}
	if (context.value) {
		onContextChange(context.value)
	}
})

const popupContainer = computed(() => listVisible.value ? getPopupContainer(liveEditor()) : undefined)

const LIST_MAX_HEIGHT = 320
// Below this the list flips above the input rather than shrinking further.
const LIST_MIN_HEIGHT = 160

// Anchored under the whole box and as wide as it: steadier than following the caret on a phone.
// It shrinks before it flips, so in a sheet it stays next to the input instead of covering the title.
watch(floating, (element, _previous, onCleanup) => {
	const reference = root.value
	if (!element || !reference) {
		return
	}
	onCleanup(autoUpdate(reference, element, () => {
		void computePosition(reference, element, {
			placement: 'bottom-start',
			middleware: [
				offset(4),
				size({
					padding: 8,
					apply({rects, availableHeight}) {
						element.style.width = `${rects.reference.width}px`
						const height = Math.max(LIST_MIN_HEIGHT, Math.min(LIST_MAX_HEIGHT, availableHeight))
						element.style.setProperty('--filter-suggestions-height', `${height}px`)
					},
				}),
				flip({padding: 8}),
				shift({padding: 8}),
			],
		}).then(({x, y}) => {
			element.style.left = `${x}px`
			element.style.top = `${y}px`
		})
	}))
}, {flush: 'post'})

onBeforeUnmount(() => clearTimeout(userSearchTimer))

// Clicks on the box's padding land in the text too.
function onBoxMouseDown(event: MouseEvent) {
	if (event.target === root.value) {
		event.preventDefault()
		liveEditor()?.commands.focus('end')
	}
}

/**
 * Inserts a field, operator or value at the caret (at the end when the input isn't focused),
 * with the spaces around it that the query needs.
 */
function insert(token: string) {
	const instance = liveEditor()
	if (!instance) {
		return
	}
	const {state, view} = instance
	const text = state.doc.textContent
	const {from, to} = instance.isFocused ? state.selection : {from: text.length + 1, to: text.length + 1}
	const insertion = spaceToken(text.slice(0, from - 1), text.slice(to - 1), token)
	view.dispatch(state.tr.insertText(insertion, from, to))
	view.focus()
}

defineExpose({
	focus: () => liveEditor()?.commands.focus('end'),
	insert,
})
</script>

<template>
	<div
		ref="root"
		:class="cn(
			fieldBoxVariants({size: 'md'}),
			`h-auto min-h-9 cursor-text items-start py-1.5 pointer-coarse:h-auto pointer-coarse:min-h-11 pointer-coarse:py-2.5`,
			props.class,
		)"
		@mousedown="onBoxMouseDown"
	>
		<EditorContent
			:editor="editor"
			class="min-w-0 flex-1"
		/>
		<Teleport
			v-if="listVisible && popupContainer && editor && suggestions && context"
			:to="popupContainer"
		>
			<div
				ref="floating"
				class="absolute top-0 left-0 z-(--z-tooltip)"
			>
				<SuggestionList
					ref="list"
					:items="suggestions.items"
					:editor="editor"
					:item-key="item => item.key"
					:label="t(LIST_LABELS[context.kind])"
					:empty-text="t('ui.listbox.empty')"
					class="max-h-(--filter-suggestions-height) w-full"
					@select="pick"
				>
					<template #item="{item}">
						<UserAvatar
							v-if="item.username"
							:username="item.username"
							:name="item.title"
							size="sm"
						/>
						<UiColorDot
							v-else
							:color="item.color ?? null"
							class="mx-1.5"
						/>
						<span class="min-w-0 flex-1 truncate text-base pointer-coarse:text-md">{{ item.title }}</span>
						<span
							v-if="item.detail"
							class="max-w-2/5 shrink-0 truncate text-xs text-ink-faint"
						>{{ item.detail }}</span>
					</template>
				</SuggestionList>
			</div>
		</Teleport>
	</div>
</template>
