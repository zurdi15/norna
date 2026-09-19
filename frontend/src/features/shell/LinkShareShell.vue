<script setup lang="ts">
import {useBaseStore} from '@/stores/base'

import NornaMark from './NornaMark.vue'

// A shared project seen without an account: no navigation, just the project.
const baseStore = useBaseStore()
</script>

<template>
	<div class="min-h-dvh">
		<div
			v-if="baseStore.logoVisible"
			class="flex h-12 items-center gap-2 px-4 pt-safe"
		>
			<NornaMark class="size-5" />
			<span class="text-sm font-semibold tracking-tight">Norna</span>
		</div>
		<main
			id="main-content"
			tabindex="-1"
			class="focus:outline-none"
		>
			<RouterView />
		</main>
	</div>
</template>
