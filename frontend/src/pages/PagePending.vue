<script setup lang="ts">
import {useRoute} from 'vue-router'

import NornaMark from '@/features/shell/NornaMark.vue'

const route = useRoute()
</script>

<template>
	<main class="grid min-h-dvh place-items-center px-4 pt-safe pb-safe">
		<div class="w-full max-w-md">
			<NornaMark class="size-12 rounded-lg" />
			<p class="mt-8 caption">
				{{ $t('pending.caption') }}
			</p>
			<h1 class="mt-2 text-2xl font-semibold tracking-tight text-balance">
				{{ $t('pending.title') }}
			</h1>
			<p class="mt-3 text-ink-muted">
				{{ $t('pending.description') }}
			</p>
			<div class="mt-6 flex items-center gap-3 border-t border-line pt-4">
				<span class="caption">{{ $t('pending.route') }}</span>
				<code class="font-mono text-xs text-ink-muted">{{ String(route.name) }}</code>
				<span class="thread" />
				<code class="font-mono text-xs text-ink-faint">{{ route.path }}</code>
			</div>
		</div>
	</main>
</template>
