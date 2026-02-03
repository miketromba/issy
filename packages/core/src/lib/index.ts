/**
 * Issue Tracking Library
 *
 * Shared library for reading, writing, and searching issues.
 * Used by both the API server and CLI.
 */

// Types
export type {
	Issue,
	IssueFrontmatter,
	IssueFilters,
	CreateIssueInput,
	UpdateIssueInput
} from './types'

// Core issue operations
export {
	setIssuesDir,
	getIssuesDir,
	ensureIssuesDir,
	autoDetectIssuesDir,
	parseFrontmatter,
	generateFrontmatter,
	getIssueIdFromFilename,
	createSlug,
	formatDate,
	getIssueFiles,
	getNextIssueNumber,
	getIssue,
	getAllIssues,
	createIssue,
	updateIssue,
	closeIssue,
	reopenIssue,
	deleteIssue
} from './issues'

// Search functionality
export {
	createSearchIndex,
	searchIssues,
	filterIssues,
	filterAndSearchIssues,
	filterByQuery
} from './search'

// Query parser
export type { ParsedQuery } from './query-parser'
export { parseQuery } from './query-parser'

// Autocomplete
export type { Suggestion } from './autocomplete'
export { getQuerySuggestions } from './autocomplete'

// Date formatting helpers (UI)
export { formatDisplayDate, formatFullDate } from './formatDate'
