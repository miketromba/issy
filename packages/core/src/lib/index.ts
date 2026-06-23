/**
 * Issue Tracking Library
 *
 * Shared library for reading, writing, and searching issues.
 * Used by both the API server and CLI.
 */

// Autocomplete
export type { Suggestion } from './autocomplete'
export { getQuerySuggestions } from './autocomplete'
// Backend abstraction (the port) + adapters
export type {
	BackendCapabilities,
	HookEvent,
	IssueBackend,
	IssuePage,
	IssueQuery,
	RoadmapPosition
} from './backend'
export { LocalBackend } from './backends/local'
// Configuration
export type { IssyConfig } from './config'
export { configPath, DEFAULT_CONFIG, readConfig } from './config'
// Date formatting helpers (UI)
export { formatDisplayDate, formatFullDate } from './formatDate'
// Core issue operations
export {
	autoDetectIssuesDir,
	closeIssue,
	compareIssuesByRoadmapOrder,
	computeOrderKey,
	createIssue,
	createSlug,
	deleteIssue,
	ensureIssuesDir,
	filterExistingDependencyIds,
	findGitRoot,
	findIssuesDirUpward,
	findIssyDirUpward,
	findLegacyIssuesDirUpward,
	formatDate,
	formatDependencyIds,
	formatExistingDependencyIds,
	generateBatchOrderKeys,
	generateFrontmatter,
	getAllIssues,
	getBlockingIssues,
	getDependencyIssues,
	getIssue,
	getIssueFiles,
	getIssueIdFromFilename,
	getIssuesDir,
	getIssyDir,
	getNextIssue,
	getNextIssueNumber,
	getOnCloseContent,
	getOnCreateContent,
	getOnUpdateContent,
	getOpenIssuesByOrder,
	hasLegacyIssuesDir,
	isIssueUnblocked,
	parseDependencyIds,
	parseFrontmatter,
	reopenIssue,
	resolveIssuesDir,
	resolveIssyDir,
	setIssuesDir,
	setIssyDir,
	updateIssue,
	validateRoadmapDependencyOrder
} from './issues'
// Query parser
export type { ParsedQuery } from './query-parser'
export { parseQuery } from './query-parser'
// Backend resolution (config-driven system-of-record selection)
export { resolveBackend, resolveIssyDirPath } from './resolveBackend'
// Search functionality
export {
	createSearchIndex,
	filterAndSearchIssues,
	filterByQuery,
	filterIssues,
	searchIssues
} from './search'
// Types
export type {
	CreateIssueInput,
	Issue,
	IssueFilters,
	IssueFrontmatter,
	UpdateIssueInput
} from './types'
