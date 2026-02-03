/**
 * Autocomplete suggestions for query input
 *
 * Provides context-aware suggestions based on the current query string
 * and cursor position.
 */

/**
 * A suggestion for autocomplete
 */
export interface Suggestion {
	/** The text to insert when selected */
	text: string
	/** The text to display in the dropdown */
	displayText: string
	/** Optional helper text describing the suggestion */
	description?: string
}

/**
 * Supported qualifier keys
 */
const QUALIFIER_KEYS = ['is', 'priority', 'type', 'label', 'sort'] as const

/**
 * Valid values for each qualifier
 */
const QUALIFIER_VALUES: Record<string, readonly string[]> = {
	is: ['open', 'closed'] as const,
	priority: ['high', 'medium', 'low'] as const,
	type: ['bug', 'improvement'] as const,
	sort: ['priority', 'created', 'updated', 'id'] as const
	// label values are dynamic and provided via existingLabels parameter
}

/**
 * Get autocomplete suggestions for a query string at a given cursor position
 *
 * @param query - The current query string
 * @param cursorPosition - The cursor position (defaults to end of string)
 * @param existingLabels - Optional array of existing labels to suggest for label: qualifier
 * @returns Array of suggestions, ordered by relevance
 *
 * @example
 * getQuerySuggestions("is:", 3)
 * // [{ text: "open", displayText: "open", description: "Open issues" }, ...]
 *
 * @example
 * getQuerySuggestions("pri", 3)
 * // [{ text: "priority:", displayText: "priority:", description: "Filter by priority" }, ...]
 */
export function getQuerySuggestions(
	query: string,
	cursorPosition?: number,
	existingLabels?: string[]
): Suggestion[] {
	// Default cursor position to end of string
	const cursor = cursorPosition ?? query.length

	// Get the text up to the cursor
	const textBeforeCursor = query.substring(0, cursor)

	// Find the current token being typed
	const { currentToken, tokenStart } = findCurrentToken(textBeforeCursor)

	// If we're in the middle of a qualifier (key:value)
	if (currentToken.includes(':')) {
		const colonIndex = currentToken.indexOf(':')
		const qualifierKey = currentToken.substring(0, colonIndex)
		const partialValue = currentToken.substring(colonIndex + 1)

		// Check if it's a supported qualifier
		if (QUALIFIER_KEYS.includes(qualifierKey as any)) {
			return getValueSuggestions(
				qualifierKey,
				partialValue,
				existingLabels
			)
		}
	}

	// Check if we're typing a qualifier key (with or without colon)
	const partialQualifier = currentToken
	if (partialQualifier && !partialQualifier.includes(':')) {
		const matchingKeys = QUALIFIER_KEYS.filter(key =>
			key.startsWith(partialQualifier.toLowerCase())
		)

		if (matchingKeys.length > 0) {
			return matchingKeys.map(key => ({
				text: `${key}:`,
				displayText: `${key}:`,
				description: getQualifierDescription(key)
			}))
		}
	}

	// If we're at the start of a new token (space or start of string)
	// and the previous token doesn't end with a colon, suggest qualifier keys
	if (currentToken === '' || currentToken.trim() === '') {
		const previousToken = getPreviousToken(textBeforeCursor)
		if (!previousToken || !previousToken.endsWith(':')) {
			return QUALIFIER_KEYS.map(key => ({
				text: `${key}:`,
				displayText: `${key}:`,
				description: getQualifierDescription(key)
			}))
		}
	}

	return []
}

/**
 * Get suggestions for a qualifier value
 */
function getValueSuggestions(
	qualifierKey: string,
	partialValue: string,
	existingLabels?: string[]
): Suggestion[] {
	const suggestions: Suggestion[] = []

	if (qualifierKey === 'label') {
		// For labels, use existing labels if provided
		if (existingLabels && existingLabels.length > 0) {
			const matchingLabels = existingLabels
				.filter(label =>
					label.toLowerCase().includes(partialValue.toLowerCase())
				)
				.slice(0, 10) // Limit to 10 suggestions

			return matchingLabels.map(label => ({
				text: label,
				displayText: label,
				description: 'Label'
			}))
		}
		return []
	}

	// For other qualifiers, use predefined values
	const validValues = QUALIFIER_VALUES[qualifierKey]
	if (!validValues) {
		return []
	}

	const matchingValues = validValues.filter(value =>
		value.toLowerCase().startsWith(partialValue.toLowerCase())
	)

	return matchingValues.map(value => ({
		text: value,
		displayText: value,
		description: getValueDescription(qualifierKey, value)
	}))
}

/**
 * Find the current token being typed at the cursor position
 */
function findCurrentToken(text: string): {
	currentToken: string
	tokenStart: number
} {
	if (!text) {
		return { currentToken: '', tokenStart: 0 }
	}

	// Find the start of the current token (last space or start of string)
	let tokenStart = text.length
	for (let i = text.length - 1; i >= 0; i--) {
		if (text[i] === ' ') {
			tokenStart = i + 1
			break
		}
		if (i === 0) {
			tokenStart = 0
		}
	}

	const currentToken = text.substring(tokenStart)
	return { currentToken, tokenStart }
}

/**
 * Get the previous token before the cursor
 */
function getPreviousToken(text: string): string | null {
	if (!text || text.trim() === '') {
		return null
	}

	const tokens = text.trim().split(/\s+/)
	if (tokens.length < 2) {
		return null
	}

	// Get the second-to-last token
	return tokens[tokens.length - 2]
}

/**
 * Get a human-readable description for a qualifier key
 */
function getQualifierDescription(key: string): string {
	const descriptions: Record<string, string> = {
		is: 'Filter by status',
		priority: 'Filter by priority',
		type: 'Filter by type',
		label: 'Filter by label',
		sort: 'Sort results'
	}
	return descriptions[key] || ''
}

/**
 * Get a human-readable description for a qualifier value
 */
function getValueDescription(key: string, value: string): string {
	if (key === 'is') {
		return value === 'open' ? 'Open issues' : 'Closed issues'
	}
	if (key === 'priority') {
		return `Priority: ${value}`
	}
	if (key === 'type') {
		return value === 'bug' ? 'Bug report' : 'Improvement'
	}
	if (key === 'sort') {
		return `Sort by ${value}`
	}
	return ''
}
