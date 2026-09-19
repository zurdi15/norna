import type {CsvAttribute, CsvColumnMapping} from '@/client/queries/migration'

/** In the order the column pickers list them. */
export const CSV_ATTRIBUTES = [
	'title',
	'description',
	'due_date',
	'start_date',
	'end_date',
	'done',
	'priority',
	'labels',
	'project',
	'reminder',
	'ignore',
] as const satisfies readonly CsvAttribute[]

// Under migration.csv.attributes.*
export const CSV_ATTRIBUTE_KEYS: Record<CsvAttribute, string> = {
	title: 'title',
	description: 'description',
	due_date: 'dueDate',
	start_date: 'startDate',
	end_date: 'endDate',
	done: 'done',
	priority: 'priority',
	labels: 'labels',
	project: 'project',
	reminder: 'reminder',
	ignore: 'ignore',
}

// Under migration.csv.delimiters.*
export const CSV_DELIMITERS = [
	{value: ',', key: 'comma'},
	{value: ';', key: 'semicolon'},
	{value: '\t', key: 'tab'},
	{value: '|', key: 'pipe'},
] as const

// The server reads dates with Go reference layouts; people know them by the pattern.
const DATE_FORMATS = [
	{layout: '2006-01-02', pattern: 'YYYY-MM-DD'},
	{layout: '2006-01-02 15:04:05', pattern: 'YYYY-MM-DD hh:mm:ss'},
	{layout: '2006-01-02T15:04:05', pattern: 'YYYY-MM-DDThh:mm:ss'},
	{layout: '2006/01/02', pattern: 'YYYY/MM/DD'},
	{layout: '02/01/2006', pattern: 'DD/MM/YYYY'},
	{layout: '02-01-2006', pattern: 'DD-MM-YYYY'},
	{layout: '02.01.2006', pattern: 'DD.MM.YYYY'},
	{layout: '01/02/2006', pattern: 'MM/DD/YYYY'},
	{layout: '01-02-2006', pattern: 'MM-DD-YYYY'},
] as const

/** The date formats to offer: the usual ones, plus the detected one when it is something else. */
export function dateFormatOptions(detected: string): {value: string, label: string}[] {
	const options: {value: string, label: string}[] = DATE_FORMATS.map(({layout, pattern}) => ({value: layout, label: pattern}))
	if (detected !== '' && !options.some(option => option.value === detected)) {
		options.unshift({value: detected, label: detected})
	}
	return options
}

/**
 * Splits the start of a CSV file into rows, honoring quotes (a quoted field may hold the
 * delimiter, a newline or a doubled quote). Enough for headers and examples, not a full import.
 */
export function parseCsvRows(text: string, delimiter: string, quote: string, limit: number): string[][] {
	const rows: string[][] = []
	let row: string[] = []
	let field = ''
	let quoted = false

	for (let i = 0; i < text.length && rows.length < limit; i++) {
		const char = text[i]
		if (quoted) {
			if (char === quote && text[i + 1] === quote) {
				field += quote
				i++
			} else if (char === quote) {
				quoted = false
			} else {
				field += char
			}
		} else if (char === quote && field === '') {
			quoted = true
		} else if (char === delimiter) {
			row.push(field)
			field = ''
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') {
				i++
			}
			row.push(field)
			rows.push(row)
			row = []
			field = ''
		} else {
			field += char
		}
	}
	if ((field !== '' || row.length > 0) && rows.length < limit) {
		row.push(field)
		rows.push(row)
	}
	// A byte order mark would stick to the first header.
	if (rows[0]?.[0]?.startsWith('﻿')) {
		rows[0][0] = rows[0][0].slice(1)
	}
	return rows
}

// The header and a few example rows fit in far less than this.
const HEAD_BYTES = 64 * 1024
const EXAMPLE_ROWS = 5

/** The header and first rows of a CSV file as read with the given delimiter. */
export async function readCsvHead(file: Blob, delimiter: string, quote: string): Promise<{columns: string[], rows: string[][]}> {
	const [columns = [], ...rows] = parseCsvRows(await file.slice(0, HEAD_BYTES).text(), delimiter, quote, EXAMPLE_ROWS + 1)
	return {columns, rows}
}

/** A mapping for new columns: a column keeps what it was mapped to by its name, the rest is ignored. */
export function remapColumns(columns: string[], previous: CsvColumnMapping[]): CsvColumnMapping[] {
	return columns.map((column_name, column_index) => ({
		column_index,
		column_name,
		attribute: previous.find(mapping => mapping.column_name === column_name)?.attribute ?? 'ignore',
	}))
}

/** The first value a column has in the example rows, to show what it holds. */
export function columnExample(rows: string[][], index: number): string {
	return rows.map(row => row[index]?.trim() ?? '').find(value => value !== '') ?? ''
}
