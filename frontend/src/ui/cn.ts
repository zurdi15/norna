import {clsx, type ClassValue} from 'clsx'
import {extendTailwindMerge} from 'tailwind-merge'

// tailwind-merge only knows Tailwind's default scales. Without these, text-2xs would be read as
// a text color and survive next to text-sm, and rounded-sheet would not replace rounded-md.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: ['3xs', '2xs', 'md'],
			radius: ['sheet'],
			shadow: ['raised', 'overlay'],
		},
	},
})

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
