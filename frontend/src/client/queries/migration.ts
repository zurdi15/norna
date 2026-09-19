import {keepPreviousData, QueryObserver, queryOptions, useMutation, useQuery} from '@tanstack/vue-query'
import type {Query, QueryClient} from '@tanstack/vue-query'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'

import {
	migrationCsvDetect,
	migrationCsvMigrate,
	migrationCsvPreview,
	migrationCsvStatus,
	migrationMicrosoftTodoAuth,
	migrationMicrosoftTodoMigrate,
	migrationMicrosoftTodoStatus,
	migrationPlankaMigrate,
	migrationPlankaStatus,
	migrationTicktickMigrate,
	migrationTicktickStatus,
	migrationTodoistAuth,
	migrationTodoistMigrate,
	migrationTodoistStatus,
	migrationTrelloAuth,
	migrationTrelloMigrate,
	migrationTrelloStatus,
	migrationNornaFileMigrate,
	migrationNornaFileStatus,
	migrationWekanMigrate,
	migrationWekanStatus,
} from '@/client/generated'
import type {AuthUrl, ColumnMapping, DetectionResult, PreviewResult, Status} from '@/client/generated'
import {captureClientRequestContext, isClientRequestContextCurrent} from '@/client/requestContext'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'

import {contextMutationOptions} from './contextMutation'

export type OAuthMigratorId = 'todoist' | 'trello' | 'microsoft-todo'
export type FileMigratorId = 'norna-file' | 'ticktick' | 'wekan'
export type CredentialsMigratorId = 'planka'
export type MigratorId = OAuthMigratorId | FileMigratorId | CredentialsMigratorId | 'csv'

export const migrationKeys = {
	all: ['migration'] as const,
	status: (service: MigratorId) => ['migration', 'status', service] as const,
	authUrl: (service: OAuthMigratorId) => ['migration', 'auth-url', service] as const,
	csvPreview: (file: number, config: CsvImportConfig) => ['migration', 'csv-preview', file, config] as const,
}

type MigrationStatusKey = ReturnType<typeof migrationKeys.status>

type Request = {signal?: AbortSignal}

const STATUS: Record<MigratorId, (options: Request) => Promise<{data: Status}>> = {
	'todoist': options => migrationTodoistStatus(options),
	'trello': options => migrationTrelloStatus(options),
	'microsoft-todo': options => migrationMicrosoftTodoStatus(options),
	'norna-file': options => migrationNornaFileStatus(options),
	'ticktick': options => migrationTicktickStatus(options),
	'wekan': options => migrationWekanStatus(options),
	'planka': options => migrationPlankaStatus(options),
	'csv': options => migrationCsvStatus(options),
}

const AUTH_URL: Record<OAuthMigratorId, (options: Request) => Promise<{data: AuthUrl}>> = {
	'todoist': options => migrationTodoistAuth(options),
	'trello': options => migrationTrelloAuth(options),
	'microsoft-todo': options => migrationMicrosoftTodoAuth(options),
}

/** The last import from one service, with the api's zero dates as null. */
export interface MigrationStatus {
	startedAt: Date | null
	finishedAt: Date | null
	// Why it failed: a key the page translates, or '' when it didn't fail.
	errorKind: string
	// Only for errorKind 'detail': the untranslated error from the user's own data.
	errorMessage: string
}

export type MigrationPhase = 'idle' | 'running' | 'done' | 'failed'

export function toMigrationStatus(status: Status | null | undefined): MigrationStatus {
	return {
		startedAt: parseDateOrNull(status?.started_at),
		finishedAt: parseDateOrNull(status?.finished_at),
		errorKind: status?.error_kind ?? '',
		errorMessage: status?.error_message ?? '',
	}
}

export function migrationPhase(status: MigrationStatus | undefined): MigrationPhase {
	if (!status?.startedAt) {
		return 'idle'
	}
	if (!status.finishedAt) {
		return 'running'
	}
	return status.errorKind === '' ? 'done' : 'failed'
}

export const MIGRATION_POLL_INTERVAL = 3000
// A stuck job must not be polled forever: past this its email is the news.
export const MIGRATION_POLL_DEADLINE = 20 * 60 * 1000

/** How long until the status is asked again: only while it runs, and not after a failed request. */
export function migrationPollInterval(status: MigrationStatus | undefined, failed: boolean): number | false {
	if (failed || migrationPhase(status) !== 'running') {
		return false
	}
	const startedAt = status?.startedAt?.getTime() ?? 0
	return Date.now() - startedAt < MIGRATION_POLL_DEADLINE ? MIGRATION_POLL_INTERVAL : false
}

// Plain options, so the background watcher's core observer can take them too.
function statusOptions(service: MigratorId) {
	return {
		queryKey: migrationKeys.status(service),
		queryFn: async ({signal}: {signal: AbortSignal}) => toMigrationStatus((await STATUS[service]({signal})).data),
		// Another tab or device may have started one.
		staleTime: 0,
		refetchInterval: (query: Query<MigrationStatus, Error, MigrationStatus, MigrationStatusKey>) =>
			migrationPollInterval(query.state.data, query.state.status === 'error'),
	}
}

export function migrationStatusQuery(service: MigratorId) {
	return queryOptions(statusOptions(service))
}

export function migrationAuthUrlQuery(service: OAuthMigratorId) {
	return queryOptions({
		queryKey: migrationKeys.authUrl(service),
		queryFn: async ({signal}) => (await AUTH_URL[service]({signal})).data.url ?? '',
		// Fixed by the server's configuration.
		staleTime: Infinity,
	})
}

const watchers = new Map<MigratorId, () => void>()

// An import can add projects, tasks and labels anywhere.
function refreshAfterImport(client: QueryClient) {
	return client.invalidateQueries({predicate: query => query.queryKey[0] !== migrationKeys.all[0]})
}

/**
 * Follows a started import until it lands, even after its page is left, then
 * refreshes what it added. Pages showing the status share the same query.
 */
export function watchMigration(client: QueryClient, service: MigratorId) {
	if (watchers.has(service)) {
		return
	}
	const context = captureClientRequestContext()
	const observer = new QueryObserver<MigrationStatus, Error, MigrationStatus, MigrationStatus, MigrationStatusKey>(client, statusOptions(service))
	const unsubscribe = observer.subscribe(result => {
		// Signed out or someone else signed in: the import isn't theirs to follow.
		if (!isClientRequestContextCurrent(context)) {
			stop()
			return
		}
		if (result.isFetching || migrationPollInterval(result.data, result.isError) !== false) {
			return
		}
		stop()
		if (migrationPhase(result.data) === 'done') {
			void refreshAfterImport(client)
		}
	})
	// Changing accounts clears the cache; a removed query would keep polling on its own.
	const unsubscribeCache = client.getQueryCache().subscribe(event => {
		if (event.type === 'removed' && event.query === observer.getCurrentQuery()) {
			stop()
		}
	})
	function stop() {
		unsubscribe()
		unsubscribeCache()
		watchers.delete(service)
	}
	watchers.set(service, stop)
}

export function stopWatchingMigrations() {
	watchers.forEach(stop => stop())
}

// The job is claimed before the request answers: show it running right away, then follow it.
function markStarted(client: QueryClient, service: MigratorId) {
	client.setQueryData<MigrationStatus>(migrationKeys.status(service), {
		startedAt: new Date(),
		finishedAt: null,
		errorKind: '',
		errorMessage: '',
	})
	watchMigration(client, service)
}

export interface MigrationCredentials {
	url: string
	token?: string
	username?: string
	password?: string
}

export type StartMigrationInput =
	| {service: OAuthMigratorId, code: string}
	| {service: FileMigratorId, file: File}
	| {service: CredentialsMigratorId, credentials: MigrationCredentials}

function startMigration(input: StartMigrationInput) {
	switch (input.service) {
		case 'todoist':
			return migrationTodoistMigrate({body: {code: input.code}})
		case 'trello':
			return migrationTrelloMigrate({body: {code: input.code}})
		case 'microsoft-todo':
			return migrationMicrosoftTodoMigrate({body: {code: input.code}})
		case 'norna-file':
			return migrationNornaFileMigrate({body: {import: input.file}})
		case 'ticktick':
			return migrationTicktickMigrate({body: {import: input.file}})
		case 'wekan':
			return migrationWekanMigrate({body: {import: input.file}})
		case 'planka':
			return migrationPlankaMigrate({body: input.credentials})
	}
}

export function startMigrationMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (input: StartMigrationInput) => {
			await startMigration(input)
		},
		onSuccess: (_data, {service}, client) => markStarted(client, service),
		// The page shows it next to the form, which is what has to change.
		toastError: () => false,
		// Input holds the uploaded file or the credentials of another service.
		gcTime: 0,
	})
}

export type CsvAttribute = NonNullable<ColumnMapping['attribute']>

export interface CsvColumnMapping {
	column_index: number
	column_name: string
	attribute: CsvAttribute
}

export interface CsvImportConfig {
	delimiter: string
	quote_char: string
	date_format: string
	skip_rows: number
	mapping: CsvColumnMapping[]
}

export interface CsvDetection {
	config: CsvImportConfig
	// The first rows as read, for examples next to each column.
	rows: string[][]
}

export function toCsvDetection(result: DetectionResult): CsvDetection {
	return {
		config: {
			delimiter: result.delimiter || ',',
			quote_char: result.quote_char || '"',
			date_format: result.date_format || '2006-01-02',
			skip_rows: 0,
			mapping: (result.suggested_mapping ?? []).map((mapping, index) => ({
				column_index: mapping.column_index ?? index,
				column_name: mapping.column_name ?? result.columns?.[index] ?? '',
				attribute: mapping.attribute ?? 'ignore',
			})),
		},
		rows: (result.preview_rows ?? []).map(row => row ?? []),
	}
}

export function hasTitleColumn(config: CsvImportConfig): boolean {
	return config.mapping.some(mapping => mapping.attribute === 'title')
}

// The server re-reads the file for every step, so each one sends it along.
function csvBody(file: File, config: CsvImportConfig) {
	return {import: file, config: JSON.stringify(config)}
}

const fileIds = new WeakMap<File, number>()
let nextFileId = 0

// Query keys can't hold a File: each picked one gets a number instead.
function fileId(file: File): number {
	let id = fileIds.get(file)
	if (id === undefined) {
		id = ++nextFileId
		fileIds.set(file, id)
	}
	return id
}

export function detectCsvMutationOptions() {
	return contextMutationOptions({
		mutationFn: async (file: File) => toCsvDetection((await migrationCsvDetect({body: {import: file}})).data),
		toastError: () => false,
		gcTime: 0,
	})
}

// A plain copy: the key must not change under the request while the form is edited.
function snapshotConfig(config: CsvImportConfig): CsvImportConfig {
	return {...config, mapping: config.mapping.map(mapping => ({...mapping}))}
}

export function csvPreviewQuery(file: File, config: CsvImportConfig) {
	const snapshot = snapshotConfig(config)
	return queryOptions({
		queryKey: migrationKeys.csvPreview(fileId(file), snapshot),
		queryFn: async ({signal}): Promise<PreviewResult> =>
			(await migrationCsvPreview({body: csvBody(file, snapshot), signal})).data,
		staleTime: Infinity,
		// The request holds the file: nothing to keep once the step is left.
		gcTime: 0,
		retry: false,
	})
}

export function startCsvImportMutationOptions() {
	return contextMutationOptions({
		mutationFn: async ({file, config}: {file: File, config: CsvImportConfig}) => {
			await migrationCsvMigrate({body: csvBody(file, config)})
		},
		onSuccess: (_data, _input, client) => markStarted(client, 'csv'),
		toastError: () => false,
		gcTime: 0,
	})
}

export function useMigrationStatus(service: MaybeRefOrGetter<MigratorId>) {
	return useQuery(computed(() => migrationStatusQuery(toValue(service))))
}

export function useMigrationAuthUrl(service: MaybeRefOrGetter<OAuthMigratorId>) {
	return useQuery(computed(() => migrationAuthUrlQuery(toValue(service))))
}

const NO_FILE = new File([], '')
const NO_CONFIG: CsvImportConfig = {delimiter: ',', quote_char: '"', date_format: '', skip_rows: 0, mapping: []}

/** The tasks a file would give with a config; asks only once a column is the title. */
export function useCsvPreview(file: MaybeRefOrGetter<File | null>, config: MaybeRefOrGetter<CsvImportConfig | null>) {
	return useQuery(computed(() => {
		const picked = toValue(file)
		const current = toValue(config)
		return {
			...csvPreviewQuery(picked ?? NO_FILE, current ?? NO_CONFIG),
			enabled: picked !== null && current !== null && hasTitleColumn(current),
			// Edits keep the last preview on screen until the new one arrives.
			placeholderData: keepPreviousData,
		}
	}))
}

export const useStartMigrationMutation = () => useMutation(startMigrationMutationOptions())
export const useDetectCsvMutation = () => useMutation(detectCsvMutationOptions())
export const useStartCsvImportMutation = () => useMutation(startCsvImportMutationOptions())
