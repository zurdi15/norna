import {createSharedComposable, useMediaQuery} from '@vueuse/core'

// Same thresholds as Tailwind's md and lg, so script and CSS switch layouts at the same width.
export const useBreakpoints = createSharedComposable(() => ({
	isMd: useMediaQuery('(min-width: 48rem)'),
	isLg: useMediaQuery('(min-width: 64rem)'),
	// Hover-capable mouse or trackpad; touch screens get sheets and larger targets instead.
	hasFinePointer: useMediaQuery('(pointer: fine)'),
}))
