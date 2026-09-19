<script setup lang="ts">
import {computed, onBeforeUnmount, provide, reactive, ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {EditorContent, useEditor, type Editor} from '@tiptap/vue-3'
import type {FocusPosition} from '@tiptap/core'

import {useUploadAttachmentsMutation} from '@/client/queries/taskAttachments'
import {useTask} from '@/composables/useTask'
import {generateAttachmentUrl} from '@/modules/task/attachmentUrl'
import {cn} from '@/ui/cn'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiSpinner from '@/ui/UiSpinner.vue'

import EditorBubbleMenus from './EditorBubbleMenus.vue'
import EditorPrompt from './EditorPrompt.vue'
import EditorToolbar from './EditorToolbar.vue'
import {createEditorExtensions} from './editorExtensions'
import {createMentionExtension} from './mention/mentionExtension'
import {taskLinkCurrentProjectIdKey} from './taskLinkContext'
import type {SaveTrigger} from './types'
import './prose.css'

/**
 * The rich text editor for task descriptions and comments.
 *
 * Editable, it is always live (no separate edit mode). It emits `save` when it loses the
 * focus with changed content ('blur'), on Mod+Enter / Mod+S ('shortcut'), and `cancel` on
 * Escape, after which it blurs without saving. Read-only, it renders the content and still
 * lets checklist items be ticked unless `checkable` is off; each tick saves ('checklist').
 */
const props = withDefaults(defineProps<{
	modelValue: string
	editable?: boolean
	placeholder?: string
	// Enables image upload (as task attachments), @mentions of the project's members and task link context.
	taskId?: number
	// comment: compact, in a field box while editable.
	variant?: 'description' | 'comment'
	autofocus?: boolean
	// Read-only only: whether checklist items can still be ticked. Turn off for viewers who can't write.
	checkable?: boolean
}>(), {
	editable: true,
	placeholder: '',
	taskId: undefined,
	variant: 'description',
	autofocus: false,
	checkable: true,
})

const emit = defineEmits<{
	'update:modelValue': [value: string]
	save: [value: string, trigger: SaveTrigger]
	cancel: []
}>()

const {t} = useI18n()
const {hasFinePointer} = useBreakpoints()

const root = useTemplateRef<HTMLElement>('root')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const {task} = useTask(() => props.taskId ?? 0)
const projectId = computed(() => task.value?.project_id)
provide(taskLinkCurrentProjectIdKey, projectId)

// TipTap serializes an empty document as an empty paragraph.
function normalize(html: string): string {
	return html === '<p></p>' ? '' : html
}

// What the editor holds, and what was last saved or received from the parent. Snapshots,
// kept in step with the prop by the modelValue watcher below.
/* eslint-disable vue/no-setup-props-reactivity-loss */
let current = props.modelValue
let saved = props.modelValue
/* eslint-enable vue/no-setup-props-reactivity-loss */

const isDirty = () => current !== saved

function save(trigger: SaveTrigger) {
	saved = current
	emit('save', current, trigger)
}

// Registered before useEditor's own unmount hook destroys the editor; it only reads the cached value.
onBeforeUnmount(() => {
	if (props.editable && isDirty()) {
		save('blur')
	}
})

const focused = ref(false)
const toolbarBusy = ref(false)
let cancelling = false

const upload = useUploadAttachmentsMutation()
const uploads = ref(0)

async function uploadAndInsertFiles(files: File[] | FileList) {
	const taskId = props.taskId
	const images = Array.from(files).filter(file => file.type.startsWith('image/'))
	if (!taskId || images.length === 0) {
		return
	}
	uploads.value += 1
	let result
	try {
		result = await upload.mutateAsync({taskId, files: images})
	} catch {
		return
	} finally {
		uploads.value -= 1
	}
	const instance = liveEditor()
	if (!instance || props.taskId !== taskId) {
		return
	}
	const content = result.uploaded.flatMap(attachment => typeof attachment.id === 'number'
		? [{type: 'image', attrs: {src: generateAttachmentUrl(taskId, attachment.id)}}]
		: [])
	instance.chain().focus().insertContent(content).run()
}

function pickImage() {
	fileInput.value?.click()
}

function onFilesPicked(event: Event) {
	const input = event.target as HTMLInputElement
	if (input.files?.length) {
		uploadAndInsertFiles(Array.from(input.files))
	}
	input.value = ''
}

const extensions = [
	...createEditorExtensions({
		t,
		isEditing: () => props.editable,
		isEditEnabled: () => props.checkable,
		placeholder: () => props.placeholder,
		bubbleSave: () => save(liveEditor()?.isEditable ? 'shortcut' : 'checklist'),
		getEditor: () => liveEditor(),
		canUpload: () => props.taskId !== undefined,
		uploadAndInsertFiles,
		pickImage,
	}),
	createMentionExtension(projectId),
]

/* eslint-disable vue/no-setup-props-reactivity-loss -- the editor takes its initial state once. */
const editor = useEditor({
	content: props.modelValue,
	editable: props.editable,
	autofocus: props.autofocus ? 'end' : false,
	extensions,
	parseOptions: {preserveWhitespace: true},
	editorProps: {
		attributes: () => ({
			class: 'norna-prose',
			role: 'textbox',
			'aria-multiline': 'true',
			'aria-label': props.placeholder || t('input.editor.label'),
			'aria-readonly': String(!props.editable),
		}),
		// Keeps the caret clear of the touch toolbar when ProseMirror scrolls it into view.
		scrollMargin: hasFinePointer.value ? 8 : {top: 8, left: 8, right: 8, bottom: 88},
		scrollThreshold: hasFinePointer.value ? 8 : {top: 8, left: 8, right: 8, bottom: 88},
	},
	onUpdate: ({editor: instance}) => {
		const value = normalize(instance.getHTML())
		if (value === current) {
			return
		}
		current = value
		emit('update:modelValue', value)
	},
	onFocus: () => {
		focused.value = true
	},
	onBlur: ({event}) => onBlur(event),
})
/* eslint-enable vue/no-setup-props-reactivity-loss */

// useEditor leaves a destroyed instance in the ref, which anything resuming after an await must skip.
function liveEditor(): Editor | undefined {
	const instance = editor.value
	return instance && !instance.isDestroyed ? instance : undefined
}

watch(() => props.editable, editable => liveEditor()?.setEditable(editable, false))

watch(() => props.modelValue, value => {
	const instance = liveEditor()
	if (!instance || value === current) {
		return
	}
	// A value arriving while the user types (a slow save response, a socket update) would wipe
	// what they typed since; their next keystroke sends the editor's content back instead.
	if (instance.isFocused && isDirty()) {
		return
	}
	current = value
	saved = value
	instance.commands.setContent(value, {emitUpdate: false, parseOptions: {preserveWhitespace: true}})
})

type PromptKind = 'link' | 'alt'

const prompt = reactive({
	open: false,
	kind: 'link' as PromptKind,
	initialValue: '',
	href: undefined as string | undefined,
	anchor: {top: 0, left: 0, height: 0},
})

function onBlur(event: FocusEvent) {
	const next = event.relatedTarget
	// Focus moving to the editor's own controls (the prompt's anchor) is not leaving it.
	if (next instanceof Node && root.value?.contains(next)) {
		return
	}
	focused.value = false
	if (!cancelling && !prompt.open && props.editable && isDirty()) {
		save('blur')
	}
}

// Blurs right away; the blur command waits for the next frame, after `cancelling` is reset.
function blurNow() {
	const instance = liveEditor()
	if (!instance) {
		return
	}
	instance.view.dom.blur()
	window.getSelection()?.removeAllRanges()
}

// Capture phase: ProseMirror marks every Escape as handled, so afterwards a plain Escape can't
// be told from one that closed a suggestion popup. An open suggestion has a decoration.
function onKeydownCapture(event: KeyboardEvent) {
	const instance = liveEditor()
	if (event.key !== 'Escape' || event.isComposing || !instance?.isEditable) {
		return
	}
	const dom = instance.view.dom
	if (!(event.target instanceof Node) || !dom.contains(event.target) || dom.querySelector('.suggestion')) {
		return
	}
	event.stopPropagation()
	emit('cancel')
	cancelling = true
	blurNow()
	cancelling = false
}

// Ticking a checklist item in an editable editor that doesn't have the focus saves it right
// away, without focusing the editor: on a phone that would pop up the keyboard for a tap.
function onChangeCapture(event: Event) {
	const input = event.target
	const instance = liveEditor()
	if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox' || !instance?.isEditable || instance.isFocused) {
		return
	}
	const content = input.closest('li[data-checked]')?.lastElementChild
	if (!content) {
		return
	}
	event.stopPropagation()
	const $pos = instance.state.doc.resolve(instance.view.posAtDOM(content, 0))
	for (let depth = $pos.depth; depth > 0; depth--) {
		const node = $pos.node(depth)
		if (node.type.name === 'taskItem') {
			instance.view.dispatch(instance.state.tr.setNodeMarkup($pos.before(depth), undefined, {...node.attrs, checked: input.checked}))
			save('checklist')
			return
		}
	}
}

// Read-only, the text of a checklist item toggles it too: a bigger target than the box.
function onContentClick(event: MouseEvent) {
	const instance = liveEditor()
	const target = event.target
	if (!instance || instance.isEditable || !props.checkable || !(target instanceof Element)) {
		return
	}
	if (target.closest('a, button, input, img, [data-node-view-wrapper]') || !window.getSelection()?.isCollapsed) {
		return
	}
	const item = target.closest('li[data-checked]')
	if (item && item.lastElementChild?.contains(target)) {
		item.querySelector<HTMLInputElement>(':scope > label > input')?.click()
	}
}

function openPrompt(kind: PromptKind) {
	const instance = liveEditor()
	const box = root.value?.getBoundingClientRect()
	if (!instance || !box) {
		return
	}
	const {from, to} = instance.state.selection
	const image = kind === 'alt' ? instance.view.nodeDOM(from) : null
	const start = image instanceof HTMLElement ? image.getBoundingClientRect() : instance.view.coordsAtPos(from)
	const end = image instanceof HTMLElement ? start : instance.view.coordsAtPos(to)
	const href = instance.getAttributes('link').href as string | undefined

	prompt.kind = kind
	prompt.href = kind === 'link' && instance.isActive('link') ? href : undefined
	prompt.initialValue = kind === 'link' ? href ?? '' : String(instance.getAttributes('image').alt ?? '')
	prompt.anchor = {
		top: start.top - box.top,
		left: start.left - box.left,
		height: Math.max(end.bottom, start.bottom) - start.top,
	}
	prompt.open = true
}

// Closing the prompt by clicking elsewhere doesn't hand the focus back, so the blur that
// opened it is the last one: save then, unless the focus did come back.
watch(() => prompt.open, open => {
	if (open) {
		return
	}
	setTimeout(() => {
		if (!focused.value && props.editable && isDirty()) {
			save('blur')
		}
	}, 300)
})

// A bare "example.com" would otherwise become a relative link.
function toHref(value: string): string {
	return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
}

function onPromptSubmit(value: string) {
	const instance = liveEditor()
	if (!instance) {
		return
	}
	if (prompt.kind === 'alt') {
		instance.chain().focus().updateAttributes('image', {alt: value || null}).run()
		return
	}
	if (value === '') {
		instance.chain().focus().extendMarkRange('link').unsetLink().run()
		return
	}
	const href = toHref(value)
	if (instance.state.selection.empty && !instance.isActive('link')) {
		instance.chain().focus().insertContent({type: 'text', text: value, marks: [{type: 'link', attrs: {href}}]}).run()
		return
	}
	instance.chain().focus().extendMarkRange('link').setLink({href}).run()
}

function onPromptRemove() {
	liveEditor()?.chain().focus().extendMarkRange('link').unsetLink().run()
}

function returnFocus() {
	liveEditor()?.commands.focus()
}

const showToolbar = computed(() => props.editable && !hasFinePointer.value && (focused.value || toolbarBusy.value))

defineExpose({
	focus: (position: FocusPosition = 'end') => liveEditor()?.commands.focus(position),
	blur: blurNow,
})
</script>

<template>
	<div
		ref="root"
		:class="cn(
			'relative min-w-0',
			variant === 'comment' && editable && `
				rounded-md border border-line-strong bg-surface transition-[border-color,box-shadow] duration-150
				focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20
			`,
		)"
		:data-editor-variant="variant"
		:data-checklist-locked="!editable && !checkable ? '' : undefined"
		@keydown.capture="onKeydownCapture"
		@change.capture="onChangeCapture"
	>
		<EditorContent
			:editor="editor"
			@click="onContentClick"
		/>

		<div
			v-if="uploads > 0"
			class="flex items-center gap-2 px-1 pt-2 text-sm text-ink-faint"
			role="status"
		>
			<UiSpinner />
			{{ t('editor.uploading') }}
		</div>

		<slot name="footer" />

		<template v-if="editor && editable">
			<EditorBubbleMenus
				v-if="hasFinePointer"
				:editor="editor"
				@editLink="openPrompt('link')"
				@editAlt="openPrompt('alt')"
			/>
			<EditorToolbar
				v-else-if="showToolbar"
				v-model:busy="toolbarBusy"
				:editor="editor"
				:can-insert-image="taskId !== undefined"
				:can-mention="taskId !== undefined"
				@editLink="openPrompt('link')"
				@editAlt="openPrompt('alt')"
				@pickImage="pickImage"
				@done="blurNow"
			/>
			<EditorPrompt
				v-model:open="prompt.open"
				:title="prompt.kind === 'link' ? t('input.editor.link') : t('input.editor.altText')"
				:label="prompt.kind === 'link' ? t('input.editor.urlPlaceholder') : t('input.editor.altText')"
				:placeholder="prompt.kind === 'link' ? 'https://' : t('input.editor.altTextPlaceholder')"
				:type="prompt.kind === 'link' ? 'url' : 'text'"
				:initial-value="prompt.initialValue"
				:href="prompt.href"
				:anchor="prompt.anchor"
				@submit="onPromptSubmit"
				@remove="onPromptRemove"
				@returnFocus="returnFocus"
			/>
			<input
				v-if="taskId !== undefined"
				ref="fileInput"
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				tabindex="-1"
				@change="onFilesPicked"
			>
		</template>
	</div>
</template>
