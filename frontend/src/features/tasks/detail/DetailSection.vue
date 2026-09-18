<script setup lang="ts">
/** A long-form block of the task (description, subtasks, attachments, activity): a small heading on a thread. */
defineProps<{
	title: string
	count?: string | number
}>()
</script>

<template>
	<section class="pt-6">
		<div class="mb-2 flex min-h-7 items-center gap-2">
			<h2 class="text-xs font-semibold text-ink-muted">
				{{ title }}
			</h2>
			<span
				v-if="count !== undefined"
				class="font-mono text-2xs text-ink-faint tabular-nums"
			>{{ count }}</span>
			<span
				class="thread"
				aria-hidden="true"
			/>
			<slot name="actions" />
		</div>
		<slot />
	</section>
</template>
