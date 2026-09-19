// Electron accelerators (https://www.electronjs.org/docs/latest/api/accelerator) for the
// desktop app's global quick entry shortcut.

const SPECIAL_KEYS: Record<string, string> = {
	Space: 'Space',
	Enter: 'Enter',
	Backspace: 'Backspace',
	Delete: 'Delete',
	Tab: 'Tab',
	Escape: 'Escape',
	ArrowUp: 'Up',
	ArrowDown: 'Down',
	ArrowLeft: 'Left',
	ArrowRight: 'Right',
	Home: 'Home',
	End: 'End',
	PageUp: 'PageUp',
	PageDown: 'PageDown',
	Minus: '-',
	Equal: '=',
	BracketLeft: '[',
	BracketRight: ']',
	Semicolon: ';',
	Quote: '\'',
	Backquote: '`',
	Backslash: '\\',
	Comma: ',',
	Period: '.',
	Slash: '/',
}

// By physical key (event.code), so the shortcut doesn't depend on the keyboard layout.
function acceleratorKey(code: string): string | null {
	if (/^Key[A-Z]$/.test(code)) {
		return code.slice(3)
	}
	if (/^Digit\d$/.test(code)) {
		return code.slice(5)
	}
	if (/^F\d{1,2}$/.test(code)) {
		return code
	}
	return SPECIAL_KEYS[code] ?? null
}

type KeyPress = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>

/**
 * The accelerator for a key press, or null while only modifiers are down or when no
 * modifier is held: a global shortcut without one would swallow that key everywhere.
 */
export function eventToAccelerator(event: KeyPress): string | null {
	if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
		return null
	}
	const modifiers = [
		(event.ctrlKey || event.metaKey) && 'CmdOrCtrl',
		event.altKey && 'Alt',
		event.shiftKey && 'Shift',
	].filter((modifier): modifier is string => modifier !== false)
	const key = acceleratorKey(event.code)
	if (modifiers.length === 0 || key === null) {
		return null
	}
	return [...modifiers, key].join('+')
}

const TO_KBD: Record<string, string> = {
	CmdOrCtrl: 'Mod',
	Up: 'ArrowUp',
	Down: 'ArrowDown',
	Left: 'ArrowLeft',
	Right: 'ArrowRight',
}

/** The accelerator in UiKbd's notation ("CmdOrCtrl+Shift+A" → "Mod+Shift+A"). */
export function acceleratorToShortcut(accelerator: string): string {
	return accelerator.split('+').map(part => TO_KBD[part] ?? part).join('+')
}
