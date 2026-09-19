import type {RouteLocationRaw} from 'vue-router'

import type {
	CredentialsMigratorId,
	FileMigratorId,
	MigrationStatus,
	MigratorId,
	OAuthMigratorId,
} from '@/client/queries/migration'

import csvIcon from './icons/csv.svg?url'
import microsoftTodoIcon from './icons/microsoft-todo.svg?url'
import plankaIcon from './icons/planka.png?url'
import tickTickIcon from './icons/ticktick.svg?url'
import todoistIcon from './icons/todoist.svg?url'
import trelloIcon from './icons/trello.svg?url'
import nornaFileIcon from './icons/norna-file.svg?url'
import wekanIcon from './icons/wekan.png?url'

interface MigratorBase {
	name: string
	icon: string
	// Under migration.services.* and migration.file.hints.*
	i18nKey: string
}

/** How an importer gets at the data: signing in elsewhere, an uploaded file, a login, or a mapped CSV. */
export type Migrator = MigratorBase & (
	| {kind: 'oauth', id: OAuthMigratorId}
	| {kind: 'file', id: FileMigratorId, accept: string}
	| {kind: 'credentials', id: CredentialsMigratorId}
	| {kind: 'csv', id: 'csv', accept: string}
)

export const MIGRATORS: {[Id in MigratorId]: Migrator & {id: Id}} = {
	'todoist': {id: 'todoist', kind: 'oauth', name: 'Todoist', icon: todoistIcon, i18nKey: 'todoist'},
	'trello': {id: 'trello', kind: 'oauth', name: 'Trello', icon: trelloIcon, i18nKey: 'trello'},
	'microsoft-todo': {id: 'microsoft-todo', kind: 'oauth', name: 'Microsoft To Do', icon: microsoftTodoIcon, i18nKey: 'microsoftTodo'},
	'norna-file': {id: 'norna-file', kind: 'file', name: 'Norna', icon: nornaFileIcon, i18nKey: 'nornaFile', accept: '.zip'},
	'ticktick': {id: 'ticktick', kind: 'file', name: 'TickTick', icon: tickTickIcon, i18nKey: 'ticktick', accept: '.csv'},
	'wekan': {id: 'wekan', kind: 'file', name: 'WeKan', icon: wekanIcon, i18nKey: 'wekan', accept: '.json'},
	'planka': {id: 'planka', kind: 'credentials', name: 'Planka', icon: plankaIcon, i18nKey: 'planka'},
	'csv': {id: 'csv', kind: 'csv', name: 'CSV', icon: csvIcon, i18nKey: 'csv', accept: '.csv,.txt'},
}

export function getMigrator(id: string): Migrator | undefined {
	return Object.hasOwn(MIGRATORS, id) ? MIGRATORS[id as MigratorId] : undefined
}

/** The importers the server offers, in its order; ids this app doesn't know are left out. */
export function availableMigrators(ids: readonly string[]): Migrator[] {
	return ids.map(getMigrator).filter(migrator => migrator !== undefined)
}

export function migratorRoute(migrator: Migrator): RouteLocationRaw {
	return migrator.kind === 'csv'
		? {name: 'migrate.csv'}
		: {name: 'migrate.service', params: {service: migrator.id}}
}

const FAILURE_KINDS = ['reported', 'interrupted', 'credentials', 'queue', 'upload'] as const

/**
 * The i18n key (under migration.failure) for why an import failed. A kind this app doesn't
 * know, a newer server's for instance, falls back to the generic text.
 */
export function failureKey(status: Pick<MigrationStatus, 'errorKind' | 'errorMessage'>): string {
	if (status.errorKind === 'detail' && status.errorMessage !== '') {
		return 'migration.failure.detail'
	}
	const kind = FAILURE_KINDS.find(known => known === status.errorKind) ?? 'reported'
	return `migration.failure.${kind}`
}

// Trello answers the authorization with the token in the url hash instead of a code.
const TOKEN_HASH_PREFIX = '#token='

/** The code (or Trello's token) an OAuth service sent back, if this is its redirect. */
export function oauthCode(code: string | undefined, hash: string): string {
	if (hash.startsWith(TOKEN_HASH_PREFIX)) {
		return hash.slice(TOKEN_HASH_PREFIX.length)
	}
	return code ?? ''
}
