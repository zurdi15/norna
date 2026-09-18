/**
 * Turns an API color ("e8e8e8", "#e8e8e8", "" or null) into a CSS hex color,
 * or undefined when no color is set.
 */
export function toCssHex(color: string | null | undefined): string | undefined {
	if (!color || color === '#') {
		return undefined
	}
	const hex = color.startsWith('#') ? color.slice(1) : color
	return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? `#${hex}` : undefined
}
