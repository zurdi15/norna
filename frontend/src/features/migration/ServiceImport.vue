<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {useQueryClient} from '@tanstack/vue-query'

import {
	migrationPhase,
	useMigrationStatus,
	useStartMigrationMutation,
	watchMigration,
	type MigrationCredentials,
	type StartMigrationInput,
} from '@/client/queries/migration'
import {formatDateShort} from '@/helpers/time/formatDate'
import {getErrorText} from '@/message'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSpinner from '@/ui/UiSpinner.vue'

import CredentialsImportForm from './CredentialsImportForm.vue'
import FileImportForm from './FileImportForm.vue'
import ImportStatusPanel from './ImportStatusPanel.vue'
import {failureKey, type Migrator} from './migrators'
import OAuthImportForm from './OAuthImportForm.vue'

/**
 * Importing from one service: its form, then the import as it runs and ends. An OAuth
 * service sends the user back with a `code`, which starts the import by itself, after
 * asking first if an earlier import could be duplicated.
 */
const props = withDefaults(defineProps<{
	migrator: Exclude<Migrator, {kind: 'csv'}>
	// From the OAuth redirect; '' otherwise.
	code?: string
}>(), {
	code: '',
})

const emit = defineEmits<{
	// A code works once: the page drops it from the url after trying it.
	codeUsed: []
}>()

const {t} = useI18n()
const queryClient = useQueryClient()
const status = useMigrationStatus(() => props.migrator.id)
const start = useStartMigrationMutation()

const phase = computed(() => migrationPhase(status.data.value))
// Once an import is seen running in this visit its end is news; an older one's is history.
const following = ref(false)
const againConfirmed = ref(false)
const startError = ref('')
let triedCode = ''

watch(phase, current => {
	if (current === 'running') {
		following.value = true
		watchMigration(queryClient, props.migrator.id)
	}
}, {immediate: true})

const previous = computed(() => !following.value && (phase.value === 'done' || phase.value === 'failed') ? status.data.value : undefined)
// Absolute: the user's relative date display would read "on in 2 days".
const previousDate = computed(() => formatDateShort(previous.value?.finishedAt))

const view = computed<'loading' | 'status' | 'starting' | 'confirm' | 'form'>(() => {
	if (status.isPending.value) {
		return 'loading'
	}
	if (following.value && phase.value !== 'idle') {
		return 'status'
	}
	if (props.migrator.kind === 'oauth' && props.code) {
		return phase.value === 'done' && !againConfirmed.value ? 'confirm' : 'starting'
	}
	return 'form'
})

async function run(input: StartMigrationInput) {
	startError.value = ''
	try {
		await start.mutateAsync(input)
		following.value = true
	} catch (cause) {
		startError.value = getErrorText(cause)
	} finally {
		// Drops the file or the credentials from the mutation cache.
		start.reset()
	}
}

function startWithFile(file: File) {
	if (props.migrator.kind === 'file') {
		void run({service: props.migrator.id, file})
	}
}

function startWithCredentials(credentials: MigrationCredentials) {
	if (props.migrator.kind === 'credentials') {
		void run({service: props.migrator.id, credentials})
	}
}

// Back from the service with a code: start, unless an earlier import needs a yes first.
watch(view, async current => {
	if (current !== 'starting' || props.migrator.kind !== 'oauth' || triedCode === props.code) {
		return
	}
	triedCode = props.code
	await run({service: props.migrator.id, code: props.code})
	emit('codeUsed')
}, {immediate: true})

function again() {
	following.value = false
	againConfirmed.value = false
}
</script>

<template>
	<div
		v-if="view === 'loading'"
		class="grid gap-3"
		aria-hidden="true"
	>
		<UiSkeleton class="h-4 w-3/4" />
		<UiSkeleton class="h-36 rounded-lg" />
	</div>
	<ImportStatusPanel
		v-else-if="view === 'status' && status.data.value"
		:migrator="migrator"
		:status="status.data.value"
		@again="again"
	/>
	<div
		v-else-if="view === 'starting'"
		class="
			flex items-center justify-center gap-3 rounded-lg border border-line bg-surface px-5 py-10 text-sm
			text-ink-muted
		"
		role="status"
	>
		<UiSpinner class="text-accent" />
		{{ t('migration.oauth.starting', {name: migrator.name}) }}
	</div>
	<section
		v-else-if="view === 'confirm'"
		class="grid gap-4 rounded-lg border border-line bg-surface p-4"
	>
		<div class="grid gap-1">
			<h3 class="text-base font-semibold">
				{{ t('migration.again.title') }}
			</h3>
			<p class="text-sm text-pretty text-ink-muted">
				{{ t('migration.again.description', {name: migrator.name, date: previousDate}) }}
			</p>
		</div>
		<div class="flex flex-wrap justify-end gap-2">
			<UiButton
				:as="RouterLink"
				:to="{name: 'migrate.start'}"
				variant="ghost"
				class="max-md:flex-1"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				class="max-md:flex-1"
				@click="againConfirmed = true"
			>
				{{ t('migration.again.confirm') }}
			</UiButton>
		</div>
	</section>
	<div
		v-else
		class="grid gap-5"
	>
		<p class="text-base text-pretty">
			{{ t('migration.service.intro', {name: migrator.name}) }}
		</p>
		<UiAlert
			v-if="previous && phase === 'done'"
			tone="warning"
		>
			{{ t('migration.again.description', {name: migrator.name, date: previousDate}) }}
		</UiAlert>
		<UiAlert
			v-else-if="previous && !startError"
			tone="danger"
		>
			{{ t('migration.service.lastFailed', {date: previousDate}) }}
			{{ t(failureKey(previous), {service: migrator.name, reason: previous.errorMessage}) }}
		</UiAlert>
		<OAuthImportForm
			v-if="migrator.kind === 'oauth'"
			:migrator="migrator"
			:error="startError"
		/>
		<FileImportForm
			v-else-if="migrator.kind === 'file'"
			:migrator="migrator"
			:loading="start.isPending.value"
			:error="startError"
			@submit="startWithFile"
		/>
		<CredentialsImportForm
			v-else
			:migrator="migrator"
			:loading="start.isPending.value"
			:error="startError"
			@submit="startWithCredentials"
		/>
	</div>
</template>
