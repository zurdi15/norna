// Case- and accent-insensitive text for matching: "camión" matches "camion", "Tromsø" matches "tromso".
export function normalizeForSearch(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/ø/gi, 'o')
		.replace(/æ/gi, 'ae')
		.replace(/å/gi, 'a')
		.toLowerCase()
		.trim()
}

export function matchesSearch(text: string, query: string): boolean {
	const needle = normalizeForSearch(query)
	return needle === '' || normalizeForSearch(text).includes(needle)
}
