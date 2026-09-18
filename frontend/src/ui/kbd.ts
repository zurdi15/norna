import {isAppleDevice} from '@/helpers/isAppleDevice'

const APPLE_KEYS: Record<string, string> = {
	mod: '⌘',
	meta: '⌘',
	control: '⌃',
	ctrl: '⌃',
	alt: '⌥',
	shift: '⇧',
}

const OTHER_KEYS: Record<string, string> = {
	mod: 'Ctrl',
	meta: 'Win',
	control: 'Ctrl',
	ctrl: 'Ctrl',
	alt: 'Alt',
	shift: 'Shift',
}

const COMMON_KEYS: Record<string, string> = {
	enter: '⏎',
	escape: 'Esc',
	backspace: '⌫',
	delete: 'Del',
	arrowup: '↑',
	arrowdown: '↓',
	arrowleft: '←',
	arrowright: '→',
	space: '␣',
	slash: '/',
	period: '.',
	comma: ',',
	backslash: '\\',
}

/**
 * A sequence like "KeyG KeyO" (press G, then O) as one keycap list per step.
 */
export function shortcutToSteps(shortcut: string, apple = isAppleDevice()): string[][] {
	return shortcut.split(' ').filter(Boolean).map(step => shortcutToKeycaps(step, apple))
}

/**
 * Splits a shortcut like "Mod+Shift+K" or "KeyK" into the keycaps to render,
 * with the platform's modifier symbols (⌘ on Apple devices, Ctrl elsewhere).
 */
export function shortcutToKeycaps(shortcut: string, apple = isAppleDevice()): string[] {
	const modifiers = apple ? APPLE_KEYS : OTHER_KEYS
	return shortcut.split('+').filter(Boolean).map(part => {
		const lower = part.toLowerCase()
		if (lower in modifiers) {
			return modifiers[lower]!
		}
		if (lower in COMMON_KEYS) {
			return COMMON_KEYS[lower]!
		}
		// event.code names: KeyK -> K, Digit1 -> 1
		return part.replace(/^Key(?=[A-Z]$)/, '').replace(/^Digit(?=\d$)/, '').toUpperCase()
	})
}
