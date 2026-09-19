<script setup lang="ts">
import {computed, onMounted, useTemplateRef} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {Check, CircleAlert, FolderOpen, RotateCcw} from '@lucide/vue'

import {migrationPhase, type MigrationStatus} from '@/client/queries/migration'
import NornaMark from '@/features/shell/NornaMark.vue'
import {formatDateLong, formatDateSince} from '@/helpers/time/formatDate'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'

import {failureKey, type Migrator} from './migrators'

/**
 * An import on its way and how it ended. The server runs it in the background, so
 * leaving the page is fine: the status keeps being followed and an email follows.
 */
const props = defineProps<{
	migrator: Pick<Migrator, 'name' | 'icon'>
	status: MigrationStatus
}>()

const emit = defineEmits<{
	// Start over: after a failure to try again, after a success to import more.
	again: []
}>()

const DOTS = 5

const {t} = useI18n()
const phase = computed(() => migrationPhase(props.status))
const failure = computed(() => t(failureKey(props.status), {service: props.migrator.name, reason: props.status.errorMessage}))

// The button that started it is gone: the news takes the focus.
const panel = useTemplateRef<HTMLElement>('panel')
onMounted(() => panel.value?.focus())
</script>

<template>
	<section
		ref="panel"
		tabindex="-1"
		role="status"
		aria-live="polite"
		class="
			grid justify-items-center gap-5 rounded-lg border border-line bg-surface px-5 py-8 text-center
			focus:outline-none
		"
	>
		<template v-if="phase === 'running'">
			<div
				class="flex items-center gap-3"
				aria-hidden="true"
			>
				<img
					:src="migrator.icon"
					alt=""
					class="size-9 rounded-md object-contain"
				>
				<span class="flex items-center gap-1.5 px-1">
					<span
						v-for="dot in DOTS"
						:key="dot"
						class="size-1 animate-pulse rounded-full bg-accent"
						:style="{animationDelay: `${dot * 180}ms`}"
					/>
				</span>
				<NornaMark class="size-9" />
			</div>
			<div class="grid gap-1">
				<h3 class="text-base font-semibold">
					{{ t('migration.state.running', {name: migrator.name}) }}
				</h3>
				<p class="max-w-sm text-sm text-pretty text-ink-muted">
					{{ t('migration.state.runningDescription') }}
				</p>
			</div>
			<p
				v-if="status.startedAt"
				class="font-mono text-2xs text-ink-faint"
			>
				{{ t('migration.state.startedAt') }}
				<time
					:datetime="status.startedAt.toISOString()"
					:title="formatDateLong(status.startedAt)"
				>{{ formatDateSince(status.startedAt) }}</time>
			</p>
		</template>
		<template v-else-if="phase === 'done'">
			<span class="grid size-10 place-items-center rounded-full bg-success-subtle text-success">
				<UiIcon
					:icon="Check"
					size="lg"
					:stroke="2.25"
				/>
			</span>
			<div class="grid gap-1">
				<h3 class="text-base font-semibold">
					{{ t('migration.state.done') }}
				</h3>
				<p class="max-w-sm text-sm text-pretty text-ink-muted">
					{{ t('migration.state.doneDescription', {name: migrator.name}) }}
				</p>
			</div>
			<div class="flex flex-wrap justify-center gap-2">
				<UiButton
					variant="ghost"
					@click="emit('again')"
				>
					{{ t('migration.state.importMore') }}
				</UiButton>
				<UiButton
					:as="RouterLink"
					:to="{name: 'projects.index'}"
					variant="primary"
					:icon="FolderOpen"
				>
					{{ t('migration.state.toProjects') }}
				</UiButton>
			</div>
		</template>
		<template v-else-if="phase === 'failed'">
			<span class="grid size-10 place-items-center rounded-full bg-danger-subtle text-danger">
				<UiIcon
					:icon="CircleAlert"
					size="lg"
				/>
			</span>
			<div class="grid gap-1">
				<h3 class="text-base font-semibold">
					{{ t('migration.state.failed') }}
				</h3>
				<p class="max-w-sm text-sm text-pretty wrap-break-word text-ink-muted">
					{{ failure }}
				</p>
			</div>
			<UiButton
				variant="primary"
				:icon="RotateCcw"
				@click="emit('again')"
			>
				{{ t('migration.state.tryAgain') }}
			</UiButton>
		</template>
	</section>
</template>
