/**
 * Core issue operations - read, write, create, update, close
 * This is the shared library used by both the API and CLI
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  CreateIssueInput,
  Issue,
  IssueFrontmatter,
  UpdateIssueInput,
} from './types'

// Default issues directory - can be overridden
let issuesDir: string | null = null

/**
 * Initialize the issues directory path
 */
export function setIssuesDir(dir: string) {
  issuesDir = dir
}

/**
 * Get the issues directory path
 */
export function getIssuesDir(): string {
  if (!issuesDir) {
    throw new Error(
      'Issues directory not initialized. Call setIssuesDir() first.',
    )
  }
  return issuesDir
}

/**
 * Ensure issues directory exists
 */
export async function ensureIssuesDir(): Promise<void> {
  await mkdir(getIssuesDir(), { recursive: true })
}

/**
 * Auto-detect issues directory from common locations
 */
export function autoDetectIssuesDir(fromPath: string): string {
  // Try to find .issues directory by walking up from the given path
  const { resolve, dirname } = require('node:path')
  const { existsSync } = require('node:fs')

  let current = resolve(fromPath)
  for (let i = 0; i < 10; i++) {
    const candidate = join(current, '.issues')
    if (existsSync(candidate)) {
      return candidate
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  throw new Error('Could not find .issues directory')
}

/**
 * Parse YAML front matter from issue content
 */
export function parseFrontmatter(content: string): {
  frontmatter: Partial<IssueFrontmatter>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const [, frontmatterStr, body] = match
  const frontmatter: Partial<IssueFrontmatter> = {}

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      ;(frontmatter as Record<string, string>)[key] = value
    }
  }

  return { frontmatter, body }
}

/**
 * Generate YAML front matter string from issue data
 */
export function generateFrontmatter(data: IssueFrontmatter): string {
  const lines = ['---']
  lines.push(`title: ${data.title}`)
  lines.push(`description: ${data.description}`)
  lines.push(`priority: ${data.priority}`)
  lines.push(`type: ${data.type}`)
  if (data.labels) {
    lines.push(`labels: ${data.labels}`)
  }
  lines.push(`status: ${data.status}`)
  lines.push(`created: ${data.created}`)
  if (data.updated) {
    lines.push(`updated: ${data.updated}`)
  }
  lines.push('---')
  return lines.join('\n')
}

/**
 * Get issue ID from filename (e.g., "0001-fix-bug.md" -> "0001")
 */
export function getIssueIdFromFilename(filename: string): string {
  const match = filename.match(/^(\d+)-/)
  return match ? match[1] : filename.replace('.md', '')
}

/**
 * Create URL-friendly slug from title
 */
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

/**
 * Format date as ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss)
 * This provides second-level precision for better sorting
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19)
}

/**
 * Get all issue filenames from the issues directory
 */
export async function getIssueFiles(): Promise<string[]> {
  try {
    const files = await readdir(getIssuesDir())
    return files.filter((f) => f.endsWith('.md') && /^\d{4}-/.test(f))
  } catch {
    return []
  }
}

/**
 * Get the next available issue number
 */
export async function getNextIssueNumber(): Promise<string> {
  const files = await getIssueFiles()
  if (files.length === 0) return '0001'

  const numbers = files
    .map((f) => parseInt(getIssueIdFromFilename(f), 10))
    .filter((n) => !Number.isNaN(n))

  const max = Math.max(...numbers, 0)
  return String(max + 1).padStart(4, '0')
}

/**
 * Load a single issue by ID
 */
export async function getIssue(id: string): Promise<Issue | null> {
  const files = await getIssueFiles()
  const paddedId = id.padStart(4, '0')

  const file = files.find(
    (f) => f.startsWith(paddedId) || getIssueIdFromFilename(f) === paddedId,
  )

  if (!file) return null

  const filepath = join(getIssuesDir(), file)
  const content = await readFile(filepath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(content)

  return {
    id: getIssueIdFromFilename(file),
    filename: file,
    frontmatter: frontmatter as IssueFrontmatter,
    content: body,
  }
}

/**
 * Load all issues
 */
export async function getAllIssues(): Promise<Issue[]> {
  const files = await getIssueFiles()
  const issues: Issue[] = []

  for (const file of files) {
    const filepath = join(getIssuesDir(), file)
    const content = await readFile(filepath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    issues.push({
      id: getIssueIdFromFilename(file),
      filename: file,
      frontmatter: frontmatter as IssueFrontmatter,
      content: body,
    })
  }

  // Sort by priority (high → medium → low), then by ID (newest first) within each priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  return issues.sort((a, b) => {
    const priorityA = priorityOrder[a.frontmatter.priority] ?? 999
    const priorityB = priorityOrder[b.frontmatter.priority] ?? 999

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    // Within same priority, sort by ID descending (newest first)
    return b.id.localeCompare(a.id)
  })
}

/**
 * Create a new issue
 */
export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  await ensureIssuesDir()
  if (!input.title) {
    throw new Error('Title is required')
  }

  const priority = input.priority || 'medium'
  const type = input.type || 'improvement'

  if (!['high', 'medium', 'low'].includes(priority)) {
    throw new Error('Priority must be: high, medium, or low')
  }

  if (!['bug', 'improvement'].includes(type)) {
    throw new Error('Type must be: bug or improvement')
  }

  const issueNumber = await getNextIssueNumber()
  const slug = createSlug(input.title)
  const filename = `${issueNumber}-${slug}.md`

  const frontmatter: IssueFrontmatter = {
    title: input.title,
    description: input.description || input.title,
    priority,
    type,
    labels: input.labels || undefined,
    status: 'open',
    created: formatDate(),
  }

  const content = `${generateFrontmatter(frontmatter)}

## Details

<!-- Add detailed description here -->

`

  await writeFile(join(getIssuesDir(), filename), content)

  return {
    id: issueNumber,
    filename,
    frontmatter,
    content: '\n## Details\n\n<!-- Add detailed description here -->\n\n',
  }
}

/**
 * Update an existing issue
 */
export async function updateIssue(
  id: string,
  input: UpdateIssueInput,
): Promise<Issue> {
  const issue = await getIssue(id)

  if (!issue) {
    throw new Error(`Issue not found: ${id}`)
  }

  // Update fields
  const updatedFrontmatter: IssueFrontmatter = {
    ...issue.frontmatter,
    ...(input.title && { title: input.title }),
    ...(input.description && { description: input.description }),
    ...(input.priority && { priority: input.priority }),
    ...(input.type && { type: input.type }),
    ...(input.labels !== undefined && {
      labels: input.labels || undefined,
    }),
    ...(input.status && { status: input.status }),
    updated: formatDate(),
  }

  const content = `${generateFrontmatter(updatedFrontmatter)}
${issue.content}`

  await writeFile(join(getIssuesDir(), issue.filename), content)

  return {
    ...issue,
    frontmatter: updatedFrontmatter,
  }
}

/**
 * Close an issue
 */
export async function closeIssue(id: string): Promise<Issue> {
  return updateIssue(id, { status: 'closed' })
}

/**
 * Reopen an issue
 */
export async function reopenIssue(id: string): Promise<Issue> {
  return updateIssue(id, { status: 'open' })
}

/**
 * Delete an issue permanently
 */
export async function deleteIssue(id: string): Promise<void> {
  const issue = await getIssue(id)

  if (!issue) {
    throw new Error(`Issue not found: ${id}`)
  }

  const { unlink } = await import('node:fs/promises')
  await unlink(join(getIssuesDir(), issue.filename))
}
