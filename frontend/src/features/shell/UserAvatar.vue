<script setup lang="ts">
import {computed, ref, watch, type HTMLAttributes} from 'vue'

import {avatarCacheVersions, fetchAvatarBlobUrl} from '@/modules/user/avatar'
import UiAvatar, {type UiAvatarSize} from '@/ui/UiAvatar.vue'

const props = withDefaults(defineProps<{
	username?: string
	name?: string
	size?: UiAvatarSize
	class?: HTMLAttributes['class']
}>(), {
	username: undefined,
	name: undefined,
	size: 'md',
	class: undefined,
})

// Requested at twice the rendered size for sharp avatars on high-density screens.
const PIXELS: Record<UiAvatarSize, number> = {
	xs: 32,
	sm: 40,
	md: 48,
	lg: 64,
	xl: 96,
}

const src = ref<string>()
let request = 0

watch(
	() => [props.username, props.size, avatarCacheVersions.get(props.username ?? '')] as const,
	async ([username, size]) => {
		const current = ++request
		const url = await fetchAvatarBlobUrl(username, PIXELS[size]).catch(() => undefined)
		// A slower response for a previous user must not overwrite the current avatar.
		if (current === request) {
			src.value = url
		}
	},
	{immediate: true},
)

const displayName = computed(() => props.name || props.username || '?')
</script>

<template>
	<UiAvatar
		:name="displayName"
		:src="src"
		:size="size"
		:class="props.class"
	/>
</template>
