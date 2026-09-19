import {ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useIntervalFn} from '@vueuse/core'

/** A clock that ticks every second, only while `active` (a running timer) is true. */
export function useSecondTicker(active: MaybeRefOrGetter<boolean>) {
	const now = ref(new Date())
	const {pause, resume} = useIntervalFn(() => {
		now.value = new Date()
	}, 1000, {immediate: false})

	watch(() => toValue(active), isActive => {
		now.value = new Date()
		if (isActive) {
			resume()
		} else {
			pause()
		}
	}, {immediate: true})

	return now
}
