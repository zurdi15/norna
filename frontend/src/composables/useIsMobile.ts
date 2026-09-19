import {computed} from 'vue'
import {createSharedComposable} from '@vueuse/core'

import {useBreakpoints} from '@/ui/composables/useBreakpoints'

// "Mobile" is everything below Tailwind's md breakpoint.
export const useIsMobile = createSharedComposable(() => {
	const {isMd} = useBreakpoints()
	return computed(() => !isMd.value)
})
