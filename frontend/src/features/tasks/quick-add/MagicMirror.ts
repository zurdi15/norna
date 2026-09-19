import {defineComponent, h, type PropType} from 'vue'

import type {MagicKind, MagicSegment} from '@/modules/quickAddMagic/highlight'
import {cn} from '@/ui/cn'

const HIGHLIGHT: Record<MagicKind, string> = {
	date: 'bg-accent-subtle text-accent ring-accent-subtle',
	label: 'bg-success-subtle text-success ring-success-subtle',
	priority: 'bg-warning-subtle text-warning ring-warning-subtle',
	project: 'bg-canvas-subtle text-ink ring-line',
	assignee: 'bg-accent-subtle text-accent ring-accent-subtle',
}

/**
 * The highlighted copy of the quick add text, laid out exactly like the textarea on
 * top of it. A render function, because a template would collapse the whitespace
 * that has to match character for character. Rings instead of padding keep widths.
 */
export default defineComponent({
	name: 'MagicMirror',
	props: {
		lines: {type: Array as PropType<MagicSegment[][]>, required: true},
	},
	setup(props) {
		return () => h('div', {'aria-hidden': 'true'}, [
			...props.lines.flatMap((line, index) => [
				...(index > 0 ? ['\n'] : []),
				...line.map(segment => segment.kind
					? h('mark', {class: cn('rounded-sm ring-2', HIGHLIGHT[segment.kind])}, segment.text)
					: segment.text),
			]),
			// Gives a trailing empty line its height.
			'​',
		])
	},
})
