/**
 * Query language parser for issues explorer
 *
 * Parses GitHub-style query syntax to extract qualifiers and free text.
 * Example: "is:open priority:high dashboard" -> { qualifiers: { is: "open", priority: "high" }, searchText: "dashboard" }
 */

/**
 * Parsed query result containing extracted qualifiers and search text
 */
export interface ParsedQuery {
	qualifiers: Record<string, string>
	searchText: string
}

/**
 * Supported qualifier keys
 */
const SUPPORTED_QUALIFIERS = new Set([
	'is',
	'priority',
	'type',
	'label',
	'sort'
])

/**
 * Parse a query string into qualifiers and free text
 *
 * @param query - The query string to parse (e.g., "is:open priority:high dashboard")
 * @returns Parsed query with qualifiers object and search text string
 *
 * @example
 * parseQuery("is:open priority:high dashboard")
 * // { qualifiers: { is: "open", priority: "high" }, searchText: "dashboard" }
 *
 * @example
 * parseQuery("type:bug label:frontend k8s cluster")
 * // { qualifiers: { type: "bug", label: "frontend" }, searchText: "k8s cluster" }
 *
 * @example
 * parseQuery("dashboard")
 * // { qualifiers: {}, searchText: "dashboard" }
 *
 * @example
 * parseQuery("is:open")
 * // { qualifiers: { is: "open" }, searchText: "" }
 */
export function parseQuery(query: string): ParsedQuery {
	const qualifiers: Record<string, string> = {}
	const searchTextParts: string[] = []

	if (!query || !query.trim()) {
		return { qualifiers, searchText: '' }
	}

	// Split by spaces, but preserve quoted strings
	const tokens = tokenizeQuery(query)

	for (const token of tokens) {
		// Check if token matches key:value pattern
		const colonIndex = token.indexOf(':')

		if (colonIndex > 0 && colonIndex < token.length - 1) {
			const key = token.substring(0, colonIndex)
			const value = token.substring(colonIndex + 1)

			// Only extract if it's a supported qualifier
			// Unknown qualifiers are treated as search text
			if (SUPPORTED_QUALIFIERS.has(key)) {
				qualifiers[key] = value
			} else {
				// Unknown qualifier format - treat as search text
				searchTextParts.push(token)
			}
		} else {
			// No colon or invalid format - treat as search text
			searchTextParts.push(token)
		}
	}

	return {
		qualifiers,
		searchText: searchTextParts.join(' ').trim()
	}
}

/**
 * Tokenize a query string, handling quoted strings
 *
 * @param query - The query string to tokenize
 * @returns Array of tokens
 */
function tokenizeQuery(query: string): string[] {
	const tokens: string[] = []
	let currentToken = ''
	let inQuotes = false
	let quoteChar = ''

	for (let i = 0; i < query.length; i++) {
		const char = query[i]

		if ((char === '"' || char === "'") && !inQuotes) {
			// Start of quoted string
			inQuotes = true
			quoteChar = char
			// Don't include the quote in the token
		} else if (char === quoteChar && inQuotes) {
			// End of quoted string
			inQuotes = false
			quoteChar = ''
			// Don't include the quote in the token
		} else if (char === ' ' && !inQuotes) {
			// Space outside quotes - end of token
			if (currentToken) {
				tokens.push(currentToken)
				currentToken = ''
			}
		} else {
			// Regular character - add to current token
			currentToken += char
		}
	}

	// Add final token if exists
	if (currentToken) {
		tokens.push(currentToken)
	}

	return tokens
}
