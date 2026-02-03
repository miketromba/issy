/**
 * Issue Tracking Library
 *
 * Shared library for reading, writing, and searching issues.
 * Used by both the API server and CLI.
 */

// Autocomplete
export type { Suggestion } from './autocomplete'
export { getQuerySuggestions } from './autocomplete'
// Date formatting helpers (UI)
export { formatDisplayDate, formatFullDate } from './formatDate'
// Core issue operations
export {
  autoDetectIssuesDir,
  closeIssue,
  createIssue,
  createSlug,
  deleteIssue,
  ensureIssuesDir,
  formatDate,
  generateFrontmatter,
  getAllIssues,
  getIssue,
  getIssueFiles,
  getIssueIdFromFilename,
  getIssuesDir,
  getNextIssueNumber,
  parseFrontmatter,
  reopenIssue,
  setIssuesDir,
  updateIssue,
} from './issues'
// Query parser
export type { ParsedQuery } from './query-parser'
export { parseQuery } from './query-parser'
// Search functionality
export {
  createSearchIndex,
  filterAndSearchIssues,
  filterByQuery,
  filterIssues,
  searchIssues,
} from './search'
// Types
export type {
  CreateIssueInput,
  Issue,
  IssueFilters,
  IssueFrontmatter,
  UpdateIssueInput,
} from './types'
