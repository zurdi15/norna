import {parseDate} from './dateParser'

export interface NaturalDate {
	date: Date
	// false when the text named only a day, so the picker can apply its own time.
	hasTime: boolean
}

export interface NaturalDateOptions {
	// Read "3/10" as 3 October instead of March 10.
	dayFirst?: boolean
}

const EN_MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december'

const MONTHS: Record<string, string> = {
	enero: 'january',
	febrero: 'february',
	marzo: 'march',
	abril: 'april',
	mayo: 'may',
	junio: 'june',
	julio: 'july',
	agosto: 'august',
	septiembre: 'september',
	setiembre: 'september',
	octubre: 'october',
	noviembre: 'november',
	diciembre: 'december',
}

const WEEKDAYS: Record<string, string> = {
	lunes: 'monday',
	martes: 'tuesday',
	miercoles: 'wednesday',
	jueves: 'thursday',
	viernes: 'friday',
	sabado: 'saturday',
	domingo: 'sunday',
}

const UNITS: Record<string, string> = {
	hora: 'hours',
	horas: 'hours',
	dia: 'days',
	dias: 'days',
	semana: 'weeks',
	semanas: 'weeks',
	mes: 'months',
	meses: 'months',
}

const NUMBERS: Record<string, number> = {
	a: 1,
	an: 1,
	one: 1,
	un: 1,
	una: 1,
	uno: 1,
	two: 2,
	dos: 2,
	three: 3,
	tres: 3,
	four: 4,
	cuatro: 4,
	five: 5,
	cinco: 5,
	six: 6,
	seis: 6,
	seven: 7,
	siete: 7,
	eight: 8,
	ocho: 8,
	nine: 9,
	nueve: 9,
	ten: 10,
	diez: 10,
}

const alternatives = (words: Record<string, unknown>) => Object.keys(words).join('|')

// Whole words only; the text is already lowercase and without accents.
function words(pattern: string): RegExp {
	return new RegExp(`(?<![\\p{L}\\d])(?:${pattern})(?![\\p{L}\\d])`, 'gu')
}

type Rule = [RegExp, string | ((...groups: string[]) => string)]

// The quick add parser only speaks English: Spanish phrases are rewritten into the
// English it understands, and bare times get the "at" it needs.
const RULES: Rule[] = [
	[words('de la (?:manana|madrugada)'), 'am'],
	[words('de la (?:tarde|noche)'), 'pm'],
	[words('pasado manana'), 'in 2 days'],
	[words('esta noche'), 'tonight'],
	[words('manana'), 'tomorrow'],
	[words('hoy'), 'today'],
	[words('(?:este )?(?:fin de semana|finde)'), 'this weekend'],
	[words('(?:a )?(?:fin|final) de(?:l)? mes'), 'end of month'],
	[words('(?:la )?(?:semana que viene|proxima semana|semana proxima)'), 'next week'],
	[words('(?:el )?(?:mes que viene|proximo mes|mes proximo)'), 'next month'],
	[
		words(`(?:el )?(proximo )?(${alternatives(WEEKDAYS)})( que viene)?`),
		(_, next, day, comingUp) => `${next || comingUp ? 'next ' : ''}${WEEKDAYS[day]}`,
	],
	[
		words(`(?:en|dentro de|in) (\\d+|${alternatives(NUMBERS)}) (${alternatives(UNITS)}|hours?|days?|weeks?|months?)`),
		(_, amount, unit) => {
			const count = NUMBERS[amount] ?? Number(amount)
			const english = UNITS[unit] ?? unit
			return `in ${count} ${count === 1 ? english.replace(/s$/, '') : english}`
		},
	],
	[words(`(\\d{1,2}) de (${alternatives(MONTHS)})(?: de \\d{4})?`), (_, day, month) => `${day} ${MONTHS[month]}`],
	[words(alternatives(MONTHS)), month => MONTHS[month]!],
	// "el 5" is the 5th of the month; the parser wants the ordinal suffix.
	[new RegExp(`(?<![\\p{L}\\d])el (\\d{1,2})(?![\\d:./]| (?:${EN_MONTHS}))`, 'gu'), (_, day) => `${day}th`],
	[words('a las? (\\d{1,2})(?:[:h.](\\d{2}))?h?( ?[ap]m)?'), (_, h, m, meridiem) => `at ${h}:${m ?? '00'}${meridiem ?? ''}`],
	[
		new RegExp('(?<![\\p{L}\\d:])(?<!(?:at|@) )(\\d{1,2})(?:[:h](\\d{2})h?|h|( ?[ap]m))(?![\\p{L}\\d])', 'gu'),
		(_, h, m, meridiem) => `at ${h}:${m ?? '00'}${meridiem ?? ''}`,
	],
]

// Lowercase, without accents and with single spaces: what the rules match against.
function plain(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
}

export function normalizeDateText(text: string, {dayFirst = false}: NaturalDateOptions = {}): string {
	let result = plain(text)
	for (const [pattern, replacement] of RULES) {
		result = typeof replacement === 'string'
			? result.replace(pattern, replacement)
			: result.replace(pattern, replacement)
	}
	if (dayFirst) {
		// The parser reads "3.10" as day.month but "3/10" as month/day.
		result = result.replace(/(?<![\d/.])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/g,
			(_, day, month, year) => year ? `${day}.${month}.${year}` : `${day}.${month}`)
	}
	return result.replace(/\s+/g, ' ').trim()
}

const EXPLICIT_TIME = /(?:^|\s)(?:(?:at|@) \d|tonight(?:\s|$)|in \d+ hours?(?:\s|$))/

/**
 * Reads a typed date such as "mañana 10:00", "next friday" or "en 3 días" with the quick
 * add parser. null when the text holds no date.
 */
export function parseNaturalDate(text: string, now: Date = new Date(), options: NaturalDateOptions = {}): NaturalDate | null {
	let normalized = normalizeDateText(text, options)
	if (normalized === '') {
		return null
	}
	// A time alone means today at that time.
	if (/^(?:at|@) /.test(normalized)) {
		normalized = `today ${normalized}`
	}
	try {
		// The parser moves the date it is given while resolving weekdays.
		const {date} = parseDate(normalized, new Date(now))
		if (!date || Number.isNaN(date.getTime())) {
			return null
		}
		return {date, hasTime: EXPLICIT_TIME.test(normalized)}
	} catch {
		return null
	}
}

// A date phrase is a few words at most ("el próximo lunes a las 9:30").
const MAX_SPAN_WORDS = 7

/**
 * Finds the date phrase in a task title the English parser missed, such as "mañana
 * a las 10" in "Llamar al fontanero mañana a las 10", and takes it out. Only a run of
 * words that is a date from end to end counts, so the rest of the title is untouched;
 * the longest run wins, and runs at the end or start of the title before inner ones.
 */
export function extractNaturalDate(text: string, now: Date = new Date()): {text: string, date: Date} | null {
	const words = text.split(' ')
	const spans: [number, number][] = []
	for (let length = Math.min(MAX_SPAN_WORDS, words.length); length >= 1; length--) {
		const last = words.length - length
		spans.push([last, length], [0, length])
		for (let start = 1; start < last; start++) {
			spans.push([start, length])
		}
	}
	for (const [start, length] of spans) {
		const span = words.slice(start, start + length).join(' ')
		if (span.trim() === '') {
			continue
		}
		// Only phrases a Spanish rule rewrote: plain words ("2nd floor", "9/11") stay the English parser's call.
		let normalized = normalizeDateText(span)
		if (normalized === plain(span)) {
			continue
		}
		if (/^(?:at|@) /.test(normalized)) {
			normalized = `today ${normalized}`
		}
		try {
			const parsed = parseDate(normalized, new Date(now))
			if (!parsed.date || Number.isNaN(parsed.date.getTime()) || parsed.newText.trim() !== '') {
				continue
			}
			const rest = [...words.slice(0, start), ...words.slice(start + length)].join(' ').replace(/\s+/g, ' ').trim()
			// "Mañana llamar al fontanero" becomes "Llamar al fontanero".
			const capitalized = start === 0 && /^\p{Lu}/u.test(text) ? rest.charAt(0).toLocaleUpperCase() + rest.slice(1) : rest
			return {text: capitalized, date: parsed.date}
		} catch {
			continue
		}
	}
	return null
}
