import {nextTick, toValue, type MaybeRefOrGetter} from 'vue'

import StarterKit from '@tiptap/starter-kit'
import {createNodeFromContent, Extension, mergeAttributes, type Editor, type Extensions} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {Fragment} from '@tiptap/pm/model'
import {marked} from 'marked'

import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import {Table, TableRow, TableCell, TableHeader} from '@tiptap/extension-table'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Underline from '@tiptap/extension-underline'
import {Placeholder} from '@tiptap/extensions'
import HardBreak from '@tiptap/extension-hard-break'

import {TaskList} from '@tiptap/extension-list'
import {TaskItemWithId} from './taskItemWithId'
import {ListKeymapWithJoin} from './listKeymapWithJoin'
import {DeleteSelectionBeforeEnter} from './deleteSelectionBeforeEnter'
import {BlockquoteWithCommentId} from './blockquoteWithCommentId'
import {TaskLink, LINK_HTML_ATTRIBUTES} from './taskLink'
import {createClipboardParser, fillRequiredContent, repairSliceContent} from './contentRepair'

import Commands from './commands'
import suggestionSetup from './suggestion'
import {EmojiExtension} from './emoji/emojiExtension'

import {common, createLowlight} from 'lowlight'

import {fetchAttachmentBlobUrl} from '@/client/queries/taskAttachments'
import {parseAttachmentUrl} from '@/modules/task/attachmentUrl'

export interface EditorExtensionDeps {
	t: (key: string) => string
	isEditing: MaybeRefOrGetter<boolean>
	// Whether checklist items may still be ticked while the editor is read-only.
	isEditEnabled: () => boolean
	placeholder: MaybeRefOrGetter<string>
	// Emits a save: Mod+Enter, Mod+S and ticking a checklist item while read-only.
	bubbleSave: () => void
	getEditor: () => Editor | undefined
	// Whether pasted or dropped images can be uploaded (they need a task to attach to).
	canUpload: () => boolean
	uploadAndInsertFiles: (files: File[] | FileList) => void
	// Opens the file picker for the "/image" command.
	pickImage?: () => void
}

// A transparent pixel: "#" would load the page itself and show a broken image while the blob loads.
const PENDING_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function isImageFile(file: File): boolean {
	return file.type.startsWith('image/')
}

const CustomTableCell = TableCell.extend({
	addAttributes() {
		return {
			// extend the existing attributes …
			...this.parent?.(),

			// and add a new one …
			backgroundColor: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-background-color'),
				renderHTML: (attributes) => {
					return {
						'data-background-color': attributes.backgroundColor,
						style: `background-color: ${attributes.backgroundColor}`,
					}
				},
			},
		}
	},
})

// prevent links from extending after space
const NonInclusiveLink = Link.extend({
	inclusive() {
		return false
	},
})

// Runs before the core keymap, which binds Mod-Enter to exitCode.
const SubmitShortcuts = Extension.create<{onSubmit: () => void}>({
	name: 'submitShortcuts',
	priority: 1100,

	addOptions() {
		return {
			onSubmit: () => {},
		}
	},

	addKeyboardShortcuts() {
		const submit = () => {
			this.options.onSubmit()
			return true
		}
		return {
			'Mod-Enter': submit,
			'Mod-s': submit,
		}
	},
})

const additionalLinkProtocols = [
	'ftp',
	'git',
	'obsidian',
	'notion',
	'message',
]

export function createEditorExtensions(deps: EditorExtensionDeps): Extensions {
	const {
		t,
		isEditing,
		isEditEnabled,
		placeholder,
		bubbleSave,
		getEditor,
		canUpload,
		uploadAndInsertFiles,
		pickImage,
	} = deps

	const CustomImage = Image.extend({
		addAttributes() {
			return {
				src: {
					default: null,
				},
				alt: {
					default: null,
				},
				title: {
					default: null,
				},
				id: {
					default: null,
					// never trust stored ids: a planted one would hijack the blob lookup
					parseHTML: () => null,
				},
				'data-src': {
					default: null,
				},
			}
		},
		renderHTML({HTMLAttributes}) {
			// Stored descriptions keep the v1 attachment url in data-src (src="#"), older ones in src.
			const imageUrl = [HTMLAttributes['data-src'], HTMLAttributes.src].find(url => parseAttachmentUrl(url) !== null)
			const attachment = parseAttachmentUrl(imageUrl)
			if (!imageUrl || !attachment) {
				return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
			}

			const id = `tiptap-image-${attachment.taskId}-${attachment.attachmentId}`

			nextTick(async () => {
				// no live view: fail closed, never fall back to document
				const root = getEditor()?.view?.dom
				if (!root) return

				// Only the DOM changes here; the stored html keeps src="#".
				const images = Array.from(root.querySelectorAll<HTMLImageElement>(`img[id="${id}"]`))
					.filter(img => img.getAttribute('src') === '#')
				if (images.length === 0) return

				images.forEach(img => {
					img.src = PENDING_IMAGE
					img.dataset.state = 'loading'
				})
				try {
					const url = await fetchAttachmentBlobUrl(attachment)
					images.forEach(img => {
						img.src = url
						delete img.dataset.state
					})
				} catch {
					images.forEach(img => {
						img.dataset.state = 'error'
					})
				}
			})

			return ['img', mergeAttributes(this.options.HTMLAttributes, {
				'data-src': imageUrl,
				src: '#',
				alt: HTMLAttributes.alt,
				title: HTMLAttributes.title,
				id,
			})]
		},
	})

	const PasteHandler = Extension.create({
		name: 'pasteHandler',

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('pasteHandler'),
					props: {
						clipboardParser: createClipboardParser(this.editor.schema),
						transformPasted: slice => repairSliceContent(slice),

						handleDrop: (view, event, _slice, moved) => {
							const files = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile)
							if (moved || files.length === 0 || !canUpload()) {
								return false
							}
							const dropped = view.posAtCoords({left: event.clientX, top: event.clientY})
							if (dropped) {
								this.editor.commands.setTextSelection(dropped.pos)
							}
							uploadAndInsertFiles(files)
							return true
						},

						handlePaste: (view, event) => {

							// Handle images pasted from clipboard
							if (canUpload() && event.clipboardData?.items?.length) {

								for (const item of event.clipboardData.items) {
									if (item.kind === 'file' && item.type.startsWith('image/')) {
										const file = item.getAsFile()
										if (file) {
											uploadAndInsertFiles([file])
											return true
										}
									}
								}
							}

							const text = event.clipboardData?.getData('text/plain') || ''
							if (!text) {
								return false
							}

							// Don't convert markdown when pasting inside a code block
							const $from = view.state.selection.$from
							if ($from.parent.type.name === 'codeBlock') {
								return false
							}

							const hasMarkdownSyntax = new RegExp('[*`_\\[\\]#-]').test(text)
							if (!hasMarkdownSyntax) {
								return false
							}

							const html = marked.parse(text) as string
							const parsed = createNodeFromContent(html, this.editor.schema, {
								parseOptions: {preserveWhitespace: 'full', ...this.editor.options.parseOptions},
							})

							this.editor.commands.insertContent(fillRequiredContent(Fragment.from(parsed)))
							return true
						},
					},
				}),
			]
		},
	})

	return [
		// Starterkit:
		StarterKit.configure({
			codeBlock: false,
			hardBreak: false,
			blockquote: false,
			listKeymap: false,
			// Registered separately below with custom options; the StarterKit copies
			// would otherwise also run (e.g. link's openOnClick opening tabs in edit mode).
			link: false,
			underline: false,
		}),
		ListKeymapWithJoin,
		DeleteSelectionBeforeEnter,
		BlockquoteWithCommentId,

		CodeBlockLowlight.configure({
			lowlight: createLowlight(common),
		}),
		HardBreak.extend({
			addKeyboardShortcuts() {
				return {
					'Shift-Enter': () => this.editor.commands.setHardBreak(),
				}
			},
		}),
		SubmitShortcuts.configure({onSubmit: bubbleSave}),

		Placeholder.configure({
			placeholder({editor}) {
				if (!toValue(isEditing) || editor.getText() !== '' && !editor.isFocused) {
					return ''
				}

				return toValue(placeholder) || t('input.editor.placeholder')
			},
		}),
		Typography,
		Subscript,
		Superscript,
		Underline,
		NonInclusiveLink.configure({
			openOnClick: false,
			shouldAutoLink: (href) => (new RegExp(
				`^(https?|${additionalLinkProtocols.join('|')}):\\/\\/`,
				'i',
			)).test(href),
			protocols: additionalLinkProtocols,
			HTMLAttributes: LINK_HTML_ATTRIBUTES,
		}),
		TaskLink,
		Table.configure({
			resizable: true,
		}),
		TableRow,
		TableHeader,
		// Custom TableCell with backgroundColor attribute
		CustomTableCell,

		CustomImage,

		TaskList,
		TaskItemWithId.configure({
			nested: true,
			onReadOnlyChecked(node, checked) {
				if (!isEditEnabled()) {
					return false
				}

				// Use taskId attribute to reliably find the correct node
				// This fixes GitHub issues #293 and #563
				const targetTaskId = node.attrs.taskId

				if (!targetTaskId) {
					// Fallback to original behavior if no ID (shouldn't happen)
					console.warn('TaskItem missing taskId, falling back to node comparison')
					getEditor()!.state.doc.descendants((subnode, pos) => {
						if (subnode === node) {
							const {tr} = getEditor()!.state
							tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								checked,
							})
							getEditor()!.view.dispatch(tr)
							bubbleSave()
						}
					})
					return true
				}

				// Find node by taskId for reliable matching
				getEditor()!.state.doc.descendants((subnode, pos) => {
					if (subnode.type.name === 'taskItem' && subnode.attrs.taskId === targetTaskId) {
						const {tr} = getEditor()!.state
						tr.setNodeMarkup(pos, undefined, {
							...subnode.attrs,
							checked,
						})
						getEditor()!.view.dispatch(tr)
						bubbleSave()
						return false // Stop iteration once found
					}
				})

				return true
			},
		}),

		Commands.configure({
			suggestion: suggestionSetup(t, {
				canInsertImage: () => pickImage !== undefined && canUpload(),
				pickImage: () => pickImage?.(),
			}),
		}),

		EmojiExtension,

		PasteHandler,
	]
}
