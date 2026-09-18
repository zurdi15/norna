import {QueryClient} from '@tanstack/vue-query'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const sdk = vi.hoisted(() => ({
	migrationCsvDetect: vi.fn(),
	migrationCsvMigrate: vi.fn(),
	migrationCsvPreview: vi.fn(),
	migrationCsvStatus: vi.fn(),
	migrationMicrosoftTodoAuth: vi.fn(),
	migrationMicrosoftTodoMigrate: vi.fn(),
	migrationMicrosoftTodoStatus: vi.fn(),
	migrationPlankaMigrate: vi.fn(),
	migrationPlankaStatus: vi.fn(),
	migrationTicktickMigrate: vi.fn(),
	migrationTicktickStatus: vi.fn(),
	migrationTodoistAuth: vi.fn(),
	migrationTodoistMigrate: vi.fn(),
	migrationTodoistStatus: vi.fn(),
	migrationTrelloAuth: vi.fn(),
	migrationTrelloMigrate: vi.fn(),
	migrationTrelloStatus: vi.fn(),
	migrationVikunjaFileMigrate: vi.fn(),
	migrationVikunjaFileStatus: vi.fn(),
	migrationWekanMigrate: vi.fn(),
	migrationWekanStatus: vi.fn(),
}))
const message = vi.hoisted(() => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/client/generated', () => sdk)
vi.mock('@/message', () => message)
vi.mock('@/helpers/apiUrl', () => ({getApiV2BaseUrl: () => '/api/v2/'}))
vi.mock('@/helpers/auth', () => ({getAuthSessionEpoch: () => 1, getToken: () => null, getTokenIdentity: () => null}))

import {
	csvPreviewQuery,
	detectCsvMutationOptions,
	hasTitleColumn,
	MIGRATION_POLL_DEADLINE,
	MIGRATION_POLL_INTERVAL,
	migrationAuthUrlQuery,
	migrationKeys,
	migrationPhase,
	migrationPollInterval,
	migrationStatusQuery,
	startCsvImportMutationOptions,
	startMigrationMutationOptions,
	stopWatchingMigrations,
	toCsvDetection,
	toMigrationStatus,
	watchMigration,
	type CsvImportConfig,
	type MigrationStatus,
	type StartMigrationInput,
} from './migration'

const NEVER = '0001-01-01T00:00:00Z'
const running = {started_at: '2026-09-18T10:00:00Z', finished_at: NEVER, error_kind: '', error_message: ''}
const finished = {...running, finished_at: '2026-09-18T10:05:00Z'}

function status(overrides: Partial<MigrationStatus> = {}): MigrationStatus {
	return {startedAt: new Date(), finishedAt: null, errorKind: '', errorMessage: '', ...overrides}
}

let client: QueryClient
beforeEach(() => {
	vi.resetAllMocks()
	client = new QueryClient({defaultOptions: {queries: {retry: false}}})
})

afterEach(() => {
	stopWatchingMigrations()
	vi.useRealTimers()
})

describe('migration status', () => {
	it('reads the api zero dates as never', () => {
		expect(toMigrationStatus({started_at: NEVER, finished_at: NEVER})).toEqual({startedAt: null, finishedAt: null, errorKind: '', errorMessage: ''})
		expect(toMigrationStatus(null)).toEqual({startedAt: null, finishedAt: null, errorKind: '', errorMessage: ''})
	})

	it('tells idle, running, done and failed apart', () => {
		expect(migrationPhase(undefined)).toBe('idle')
		expect(migrationPhase(toMigrationStatus({started_at: NEVER, finished_at: NEVER}))).toBe('idle')
		expect(migrationPhase(toMigrationStatus(running))).toBe('running')
		expect(migrationPhase(toMigrationStatus(finished))).toBe('done')
		expect(migrationPhase(toMigrationStatus({...finished, error_kind: 'credentials'}))).toBe('failed')
	})

	it('polls only while running, until a failed request or the deadline', () => {
		expect(migrationPollInterval(status(), false)).toBe(MIGRATION_POLL_INTERVAL)
		expect(migrationPollInterval(status(), true)).toBe(false)
		expect(migrationPollInterval(status({finishedAt: new Date()}), false)).toBe(false)
		expect(migrationPollInterval(undefined, false)).toBe(false)
		expect(migrationPollInterval(status({startedAt: new Date(Date.now() - MIGRATION_POLL_DEADLINE - 1)}), false)).toBe(false)
	})

	it('asks the status of the right service', async () => {
		sdk.migrationWekanStatus.mockResolvedValue({data: finished})
		const result = await client.fetchQuery(migrationStatusQuery('wekan'))
		expect(sdk.migrationWekanStatus).toHaveBeenCalledExactlyOnceWith({signal: expect.any(AbortSignal)})
		expect(sdk.migrationTodoistStatus).not.toHaveBeenCalled()
		expect(result.finishedAt).toEqual(new Date('2026-09-18T10:05:00Z'))
	})

	it('gets the auth url of an OAuth service', async () => {
		sdk.migrationMicrosoftTodoAuth.mockResolvedValue({data: {url: 'https://login.test/authorize'}})
		expect(await client.fetchQuery(migrationAuthUrlQuery('microsoft-todo'))).toBe('https://login.test/authorize')
	})
})

describe('starting an import', () => {
	function start(input: StartMigrationInput) {
		return client.getMutationCache().build(client, startMigrationMutationOptions()).execute(input)
	}

	it('sends a code, a file or credentials to the right service and forgets them', async () => {
		expect(startMigrationMutationOptions().gcTime).toBe(0)
		sdk.migrationTrelloMigrate.mockResolvedValue({data: {}})
		sdk.migrationTicktickMigrate.mockResolvedValue({data: {}})
		sdk.migrationPlankaMigrate.mockResolvedValue({data: {}})
		const file = new File(['x'], 'backup.csv')

		await start({service: 'trello', code: 'token'})
		await start({service: 'ticktick', file})
		await start({service: 'planka', credentials: {url: 'https://planka.test', token: 'key'}})

		expect(sdk.migrationTrelloMigrate).toHaveBeenCalledExactlyOnceWith({body: {code: 'token'}})
		expect(sdk.migrationTicktickMigrate).toHaveBeenCalledExactlyOnceWith({body: {import: file}})
		expect(sdk.migrationPlankaMigrate).toHaveBeenCalledExactlyOnceWith({body: {url: 'https://planka.test', token: 'key'}})
	})

	it('shows the import running at once, replacing an older finished one', async () => {
		client.setQueryData(migrationKeys.status('wekan'), toMigrationStatus(finished))
		sdk.migrationWekanMigrate.mockResolvedValue({data: {}})
		sdk.migrationWekanStatus.mockResolvedValue({data: running})

		await start({service: 'wekan', file: new File(['{}'], 'board.json')})

		expect(migrationPhase(client.getQueryData(migrationKeys.status('wekan')))).toBe('running')
	})

	it('leaves the error to the page', async () => {
		sdk.migrationPlankaMigrate.mockRejectedValue({status: 400, code: 14204})
		await expect(start({service: 'planka', credentials: {url: 'https://planka.test', token: 'bad'}})).rejects.toEqual({status: 400, code: 14204})
		expect(message.error).not.toHaveBeenCalled()
		expect(client.getQueryData(migrationKeys.status('planka'))).toBeUndefined()
	})
})

describe('following an import', () => {
	it('polls until it finishes, then refreshes what it added', async () => {
		vi.useFakeTimers()
		client.setQueryData(['projects', 'list'], [])
		sdk.migrationTodoistStatus
			.mockResolvedValueOnce({data: {...running, started_at: new Date().toISOString()}})
			.mockResolvedValueOnce({data: {...running, started_at: new Date().toISOString()}})
			.mockResolvedValue({data: {...finished, started_at: new Date().toISOString(), finished_at: new Date().toISOString()}})

		watchMigration(client, 'todoist')
		watchMigration(client, 'todoist')
		await vi.advanceTimersByTimeAsync(0)
		expect(sdk.migrationTodoistStatus).toHaveBeenCalledTimes(1)
		expect(client.getQueryState(['projects', 'list'])?.isInvalidated).toBe(false)

		await vi.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL * 2)
		expect(sdk.migrationTodoistStatus).toHaveBeenCalledTimes(3)
		expect(client.getQueryState(['projects', 'list'])?.isInvalidated).toBe(true)
		expect(client.getQueryState(migrationKeys.status('todoist'))?.isInvalidated).toBe(false)

		await vi.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL * 3)
		expect(sdk.migrationTodoistStatus).toHaveBeenCalledTimes(3)
	})

	it('stops when the cache is cleared for another account', async () => {
		vi.useFakeTimers()
		sdk.migrationWekanStatus.mockResolvedValue({data: {...running, started_at: new Date().toISOString()}})

		watchMigration(client, 'wekan')
		await vi.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL)
		expect(sdk.migrationWekanStatus).toHaveBeenCalledTimes(2)

		client.clear()
		await vi.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL * 3)
		expect(sdk.migrationWekanStatus).toHaveBeenCalledTimes(2)
	})

	it('refreshes nothing when the import failed', async () => {
		vi.useFakeTimers()
		client.setQueryData(['projects', 'list'], [])
		sdk.migrationCsvStatus
			.mockResolvedValueOnce({data: {...running, started_at: new Date().toISOString()}})
			.mockResolvedValue({data: {...finished, started_at: new Date().toISOString(), error_kind: 'interrupted'}})

		watchMigration(client, 'csv')
		await vi.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL * 3)

		expect(sdk.migrationCsvStatus).toHaveBeenCalledTimes(2)
		expect(client.getQueryState(['projects', 'list'])?.isInvalidated).toBe(false)
	})
})

describe('csv import', () => {
	const config: CsvImportConfig = {
		delimiter: ';',
		quote_char: '"',
		date_format: '02/01/2006',
		skip_rows: 0,
		mapping: [{column_index: 0, column_name: 'Name', attribute: 'title'}],
	}

	it('fills in what the detection left out', () => {
		expect(toCsvDetection({
			columns: ['Name', 'Due'],
			delimiter: ';',
			suggested_mapping: [{column_index: 0, column_name: 'Name', attribute: 'title'}, {column_index: 1}],
			preview_rows: [['Milk', '01/02/2026'], null],
		})).toEqual({
			config: {
				delimiter: ';',
				quote_char: '"',
				date_format: '2006-01-02',
				skip_rows: 0,
				mapping: [
					{column_index: 0, column_name: 'Name', attribute: 'title'},
					{column_index: 1, column_name: 'Due', attribute: 'ignore'},
				],
			},
			rows: [['Milk', '01/02/2026'], []],
		})
	})

	it('needs a title column', () => {
		expect(hasTitleColumn(config)).toBe(true)
		expect(hasTitleColumn({...config, mapping: [{column_index: 0, column_name: 'Name', attribute: 'description'}]})).toBe(false)
	})

	it('detects with the file alone', async () => {
		sdk.migrationCsvDetect.mockResolvedValue({data: {columns: ['Name'], delimiter: ',', suggested_mapping: [], preview_rows: null}})
		const file = new File(['Name\nMilk'], 'tasks.csv')
		const detection = await client.getMutationCache().build(client, detectCsvMutationOptions()).execute(file)
		expect(sdk.migrationCsvDetect).toHaveBeenCalledExactlyOnceWith({body: {import: file}})
		expect(detection.rows).toEqual([])
	})

	it('previews with the config as json, keyed by file and a copy of the config', async () => {
		sdk.migrationCsvPreview.mockResolvedValue({data: {tasks: [{title: 'Milk'}], total_rows: 1}})
		const file = new File(['Name\nMilk'], 'tasks.csv')
		const options = csvPreviewQuery(file, config)

		expect(await client.fetchQuery(options)).toEqual({tasks: [{title: 'Milk'}], total_rows: 1})
		expect(sdk.migrationCsvPreview).toHaveBeenCalledExactlyOnceWith({body: {import: file, config: JSON.stringify(config)}, signal: expect.any(AbortSignal)})

		config.mapping[0]!.attribute = 'description'
		expect(options.queryKey[3]).toEqual({...config, mapping: [{column_index: 0, column_name: 'Name', attribute: 'title'}]})
		config.mapping[0]!.attribute = 'title'
		expect(csvPreviewQuery(file, config).queryKey).toEqual(options.queryKey)
		expect(csvPreviewQuery(new File(['Name\nMilk'], 'tasks.csv'), config).queryKey).not.toEqual(options.queryKey)
	})

	it('imports and follows the csv status', async () => {
		sdk.migrationCsvMigrate.mockResolvedValue({data: {}})
		sdk.migrationCsvStatus.mockResolvedValue({data: running})
		const file = new File(['Name\nMilk'], 'tasks.csv')
		const options = startCsvImportMutationOptions()
		expect(options.gcTime).toBe(0)

		await client.getMutationCache().build(client, options).execute({file, config})

		expect(sdk.migrationCsvMigrate).toHaveBeenCalledExactlyOnceWith({body: {import: file, config: JSON.stringify(config)}})
		expect(migrationPhase(client.getQueryData(migrationKeys.status('csv')))).toBe('running')
	})
})
