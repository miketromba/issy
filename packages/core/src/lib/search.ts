/**
 * Fuzzy search functionality for issues using Fuse.js
 */

import Fuse, { type IFuseOptions } from 'fuse.js'
import { parseQuery } from './query-parser'
import type { Issue, IssueFilters } from './types'

// Fuse.js configuration for fuzzy search
const FUSE_OPTIONS: IFuseOptions<Issue> = {
  keys: [
    { name: 'frontmatter.title', weight: 1.0 },
    { name: 'frontmatter.description', weight: 0.7 },
    { name: 'frontmatter.labels', weight: 0.5 },
    { name: 'content', weight: 0.3 },
  ],
  threshold: 0.4, // 0 = exact match, 1 = match anything
  ignoreLocation: true, // search entire string, not just beginning
  includeScore: true,
}

/**
 * Create a Fuse.js instance for searching issues
 */
export function createSearchIndex(issues: Issue[]): Fuse<Issue> {
  return new Fuse(issues, FUSE_OPTIONS)
}

/**
 * Search issues with fuzzy matching
 * Returns issues sorted by relevance
 */
export function searchIssues(fuse: Fuse<Issue>, query: string): Issue[] {
  if (!query.trim()) {
    return []
  }

  const results = fuse.search(query)
  return results.map((r) => r.item)
}

/**
 * Filter issues by frontmatter fields
 */
export function filterIssues(issues: Issue[], filters: IssueFilters): Issue[] {
  return issues.filter((issue) => {
    if (filters.status && issue.frontmatter.status !== filters.status) {
      return false
    }
    if (filters.priority && issue.frontmatter.priority !== filters.priority) {
      return false
    }
    if (filters.type && issue.frontmatter.type !== filters.type) {
      return false
    }
    return true
  })
}

/**
 * Filter and search issues
 * Applies filters first, then fuzzy search if query provided
 * ID matches (exact prefix) are ranked first
 */
export function filterAndSearchIssues(
  issues: Issue[],
  filters: IssueFilters,
): Issue[] {
  // First apply dropdown filters
  let result = filterIssues(issues, filters)

  // Then apply fuzzy search if there's a search term
  if (filters.search?.trim()) {
    const query = filters.search.trim()

    // Check for ID matches first (exact prefix match)
    // Supports: "1" -> "0001", "01" -> "0001", "0001" -> "0001"
    const idMatches: Issue[] = []
    const nonIdMatches: Issue[] = []

    const normalizedQuery = query.replace(/^0+/, '') // Remove leading zeros

    for (const issue of result) {
      const normalizedId = issue.id.replace(/^0+/, '')
      if (
        normalizedId.startsWith(normalizedQuery) ||
        issue.id.startsWith(query)
      ) {
        idMatches.push(issue)
      }
    }

    // Now do fuzzy search
    const fuse = createSearchIndex(issues)
    const searchResults = fuse.search(query)
    const matchedIds = new Set(searchResults.map((r) => r.item.id))

    // Get fuzzy matches that aren't already ID matches
    const idMatchSet = new Set(idMatches.map((i) => i.id))
    for (const issue of result) {
      if (!idMatchSet.has(issue.id) && matchedIds.has(issue.id)) {
        nonIdMatches.push(issue)
      }
    }

    // Sort fuzzy matches by relevance
    nonIdMatches.sort((a, b) => {
      const aScore = searchResults.find((r) => r.item.id === a.id)?.score ?? 1
      const bScore = searchResults.find((r) => r.item.id === b.id)?.score ?? 1
      return aScore - bScore // Lower score = better match
    })

    // ID matches first, then fuzzy matches
    result = [...idMatches, ...nonIdMatches]
  }

  return result
}

/**
 * Sort issues by the specified sort option
 *
 * @param issues - Array of issues to sort (modified in place)
 * @param sortBy - Sort option: "priority", "created", "updated", or "id"
 */
function sortIssues(issues: Issue[], sortBy: string): void {
  const sortOption = sortBy.toLowerCase()

  if (sortOption === 'priority') {
    // Sort by priority (high → medium → low), then by ID (newest first)
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    }
    issues.sort((a, b) => {
      const priorityA = priorityOrder[a.frontmatter.priority] ?? 999
      const priorityB = priorityOrder[b.frontmatter.priority] ?? 999
      if (priorityA !== priorityB) return priorityA - priorityB
      return b.id.localeCompare(a.id) // newest first within priority
    })
  } else if (sortOption === 'created') {
    // Sort by creation date (newest first)
    issues.sort((a, b) => {
      const dateA = a.frontmatter.created || ''
      const dateB = b.frontmatter.created || ''
      if (dateA !== dateB) return dateB.localeCompare(dateA) // newest first
      return b.id.localeCompare(a.id) // fallback to ID
    })
  } else if (sortOption === 'created-asc') {
    // Sort by creation date (oldest first)
    issues.sort((a, b) => {
      const dateA = a.frontmatter.created || ''
      const dateB = b.frontmatter.created || ''
      if (dateA !== dateB) return dateA.localeCompare(dateB) // oldest first
      return a.id.localeCompare(b.id) // fallback to ID
    })
  } else if (sortOption === 'updated') {
    // Sort by last updated date (most recent first), fallback to created if no updated
    issues.sort((a, b) => {
      const dateA = a.frontmatter.updated || a.frontmatter.created || ''
      const dateB = b.frontmatter.updated || b.frontmatter.created || ''
      if (dateA !== dateB) return dateB.localeCompare(dateA) // newest first
      return b.id.localeCompare(a.id) // fallback to ID
    })
  } else if (sortOption === 'id') {
    // Sort by issue ID (newest first)
    issues.sort((a, b) => b.id.localeCompare(a.id))
  } else {
    // Invalid sort option - default to priority sort
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    }
    issues.sort((a, b) => {
      const priorityA = priorityOrder[a.frontmatter.priority] ?? 999
      const priorityB = priorityOrder[b.frontmatter.priority] ?? 999
      if (priorityA !== priorityB) return priorityA - priorityB
      return b.id.localeCompare(a.id) // newest first within priority
    })
  }
}

/**
 * Filter issues using parsed query qualifiers and fuzzy search
 *
 * Supports the following qualifiers:
 * - `is:open` / `is:closed` - filters by status
 * - `priority:high` / `priority:medium` / `priority:low` - filters by priority
 * - `type:bug` / `type:improvement` - filters by type
 * - `label:x` - filters by label (case-insensitive partial match)
 * - `sort:priority` / `sort:created` / `sort:created-asc` / `sort:updated` / `sort:id` - sorts results
 *
 * Any remaining free text after qualifiers triggers fuzzy search across title,
 * description, labels, and content. Results are sorted by relevance when search
 * text is present. When no search text is provided, results are sorted by the
 * `sort:` qualifier (defaults to priority if not specified). ID prefix matching
 * is supported (e.g., "1" matches #0001).
 *
 * Invalid qualifier values are ignored (issue passes filter).
 * Multiple qualifiers use AND logic (all must match).
 *
 * @param issues - Array of issues to filter
 * @param query - Query string containing qualifiers and/or search text (e.g., "is:open dashboard")
 * @returns Filtered array of issues matching all qualifiers and search text
 *
 * @example
 * filterByQuery(issues, "is:open")
 * // Returns only open issues, sorted by priority (default)
 *
 * @example
 * filterByQuery(issues, "is:open sort:created")
 * // Returns only open issues, sorted by creation date (newest first)
 *
 * @example
 * filterByQuery(issues, "is:open priority:high type:bug")
 * // Returns only open, high priority bugs, sorted by priority (default)
 *
 * @example
 * filterByQuery(issues, "label:frontend sort:updated")
 * // Returns only issues with "frontend" in their labels, sorted by update date
 *
 * @example
 * filterByQuery(issues, "dashboard")
 * // Returns issues matching "dashboard" via fuzzy search, sorted by relevance
 *
 * @example
 * filterByQuery(issues, "is:open dashboard")
 * // Returns open issues matching "dashboard" via fuzzy search, sorted by relevance
 */
export function filterByQuery(issues: Issue[], query: string): Issue[] {
  const parsed = parseQuery(query)

  // First, filter by qualifiers
  let result = issues.filter((issue) => {
    // is: qualifier (maps to status)
    if (parsed.qualifiers.is) {
      const statusValue = parsed.qualifiers.is.toLowerCase()
      // Only filter if value is valid (open or closed)
      if (statusValue === 'open' || statusValue === 'closed') {
        if (issue.frontmatter.status !== statusValue) {
          return false
        }
      }
      // Invalid values are ignored (issue passes filter)
    }

    // priority: qualifier
    if (parsed.qualifiers.priority) {
      const priorityValue = parsed.qualifiers.priority.toLowerCase()
      // Only filter if value is valid (high, medium, or low)
      if (
        priorityValue === 'high' ||
        priorityValue === 'medium' ||
        priorityValue === 'low'
      ) {
        if (issue.frontmatter.priority !== priorityValue) {
          return false
        }
      }
      // Invalid values are ignored (issue passes filter)
    }

    // type: qualifier
    if (parsed.qualifiers.type) {
      const typeValue = parsed.qualifiers.type.toLowerCase()
      // Only filter if value is valid (bug or improvement)
      if (typeValue === 'bug' || typeValue === 'improvement') {
        if (issue.frontmatter.type !== typeValue) {
          return false
        }
      }
      // Invalid values are ignored (issue passes filter)
    }

    // label: qualifier
    if (parsed.qualifiers.label) {
      const labelQuery = parsed.qualifiers.label.toLowerCase()
      const issueLabels = (issue.frontmatter.labels || '').toLowerCase()
      // Check if the label query appears in the issue's labels (partial match)
      if (!issueLabels.includes(labelQuery)) {
        return false
      }
    }

    return true
  })

  // Apply sorting if no search text (search text uses relevance sorting)
  if (!parsed.searchText.trim()) {
    const sortBy = parsed.qualifiers.sort?.toLowerCase() || 'priority'
    sortIssues(result, sortBy)
  }

  // If there's search text, apply fuzzy search
  if (parsed.searchText.trim()) {
    const searchQuery = parsed.searchText.trim()

    // Check for ID matches first (exact prefix match)
    // Supports: "1" -> "0001", "01" -> "0001", "0001" -> "0001"
    const idMatches: Issue[] = []
    const nonIdMatches: Issue[] = []

    const normalizedQuery = searchQuery.replace(/^0+/, '') // Remove leading zeros

    for (const issue of result) {
      const normalizedId = issue.id.replace(/^0+/, '')
      if (
        normalizedId.startsWith(normalizedQuery) ||
        issue.id.startsWith(searchQuery)
      ) {
        idMatches.push(issue)
      }
    }

    // Now do fuzzy search on the filtered results
    const fuse = createSearchIndex(result)
    const searchResults = fuse.search(searchQuery)
    const matchedIds = new Set(searchResults.map((r) => r.item.id))

    // Get fuzzy matches that aren't already ID matches
    const idMatchSet = new Set(idMatches.map((i) => i.id))
    for (const issue of result) {
      if (!idMatchSet.has(issue.id) && matchedIds.has(issue.id)) {
        nonIdMatches.push(issue)
      }
    }

    // Sort fuzzy matches by relevance
    nonIdMatches.sort((a, b) => {
      const aScore = searchResults.find((r) => r.item.id === a.id)?.score ?? 1
      const bScore = searchResults.find((r) => r.item.id === b.id)?.score ?? 1
      return aScore - bScore // Lower score = better match
    })

    // ID matches first, then fuzzy matches
    result = [...idMatches, ...nonIdMatches]
  }

  return result
}
