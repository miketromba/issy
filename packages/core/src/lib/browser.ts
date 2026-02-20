/**
 * Browser-safe exports from issy-core
 * These functions work in both browser and Node.js environments
 */

// Date formatting helpers
export { formatDisplayDate, formatFullDate } from './formatDate'

// Query parser
export type { ParsedQuery } from './query-parser'
export { parseQuery } from './query-parser'

// Search functionality (pure functions)
export { filterByQuery, filterIssues } from './search'

// Types
export type {
	CreateIssueInput,
	Issue,
	IssueFilters,
	IssueFrontmatter,
	UpdateIssueInput
} from './types'
